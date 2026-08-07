import logger from '../../../shared/logger/logger.js';

export class IntentClassifier {
  static classify(queryText, discussedShortcodes, urls) {
    const query = queryText.toLowerCase().trim();
    const urlRegex = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/i;
    const match = query.match(urlRegex);
    let detectedUrl = null;
    if (match) {
      detectedUrl = match[1];
      if (!/^https?:\/\
        detectedUrl = 'https://' + detectedUrl;
      }
    } else {
      const domainRegex = /\b([a-zA-Z0-9-]+\.[a-zA-Z]{2,6}(?:\/[^\s\)]*)?)/i;
      const domainMatch = query.match(domainRegex);
      if (domainMatch) {
        const word = domainMatch[1].toLowerCase();
        const blacklist = ['.png', '.jpg', '.jpeg', '.gif', '.js', '.css', '.html', '.mp3', '.mp4', 'hlo', 'hey', 'hello'];
        if (!blacklist.some(ext => word.endsWith(ext) || word.startsWith(ext))) {
          detectedUrl = 'https://' + word;
        }
      }
    }
    let isShortened = false;
    let shortCodeResolved = null;
    if (detectedUrl) {
      try {
        const parsed = new URL(detectedUrl);
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && lastPart.length >= 3 && lastPart.length <= 10) {
          const matchCode = urls.find(u => u.shortCode.toLowerCase() === lastPart.toLowerCase());
          if (matchCode) {
            isShortened = true;
            shortCodeResolved = matchCode;
          }
        }
      } catch (e) {}

      if (!isShortened) {
        const matchCode = urls.find(u => query.includes(u.shortCode.toLowerCase()));
        if (matchCode) {
          isShortened = true;
          shortCodeResolved = matchCode;
        }
      }
    }
    const dbKeywords = ['my links', 'my workspace', 'my dashboard', 'my analytics', 'my campaigns', 'my folders', 'my workspaces'];
    const hasDbKeyword = dbKeywords.some(kw => query.includes(kw));

    if (detectedUrl && !isShortened && !hasDbKeyword) {
      const analyzeKeywords = ['analyze', 'summarize', 'what is', 'explain', 'safe', 'security', 'health', 'check', 'audit', 'verdict', 'report', 'page', 'site', 'website'];
      const isAnalysisQuery = analyzeKeywords.some(kw => query.includes(kw)) || query.includes(detectedUrl.toLowerCase());
      if (isAnalysisQuery) {
        logger.info('IntentClassifier: PUBLIC_WEBSITE_ANALYSIS matched for url: ' + detectedUrl);
        return { intent: 'PUBLIC_WEBSITE_ANALYSIS', targetUrlText: detectedUrl, targetUrl: null };
      }
    }
    let targetUrl = shortCodeResolved || null;
    const refKeywords = ['this link', 'that url', 'this campaign', 'the previous one', 'the first link', 'the second link', 'it', 'them', 'those links', 'this shortened url'];
    const matchesRef = refKeywords.some(k => query.includes(k));

    if (matchesRef) {
      if (query.includes('second link') && discussedShortcodes.length > 1) {
        targetUrl = urls.find(u => u.shortCode === discussedShortcodes[1]);
      } else if (discussedShortcodes.length > 0) {
        targetUrl = urls.find(u => u.shortCode === discussedShortcodes[0]);
      }
    }

    if (!targetUrl) {
      for (const u of urls) {
        if (query.includes(u.shortCode.toLowerCase()) || (u.title && query.includes(u.title.toLowerCase()))) {
          targetUrl = u;
          break;
        }
      }
    }
    if (query.includes('youtube') || query.includes('youtu.be')) {
      logger.info('IntentClassifier: DB_YOUTUBE_LINKS match');
      return { intent: 'DB_YOUTUBE_LINKS', targetUrl: null };
    }
    if (query.includes('github') || query.includes('git hub')) {
      logger.info('IntentClassifier: DB_GITHUB_LINKS match');
      return { intent: 'DB_GITHUB_LINKS', targetUrl: null };
    }
    if (query.includes('most clicks') || query.includes('highest clicks') || query.includes('max clicks') || query.includes('most clicked') || query.includes('top clicks') || query.includes('highest traffic') || query.includes('popular link') || query.includes('best link') || query.includes('best performing link')) {
      logger.info('IntentClassifier: DB_MOST_CLICKED match');
      return { intent: 'DB_MOST_CLICKED', targetUrl: null };
    }
    if (query.includes('expired')) {
      logger.info('IntentClassifier: DB_EXPIRED_LINKS match');
      return { intent: 'DB_EXPIRED_LINKS', targetUrl: null };
    }
    if (query.includes('zero clicks') || query.includes('0 clicks') || query.includes('no clicks') || query.includes('zero click')) {
      logger.info('IntentClassifier: DB_ZERO_CLICK_LINKS match');
      return { intent: 'DB_ZERO_CLICK_LINKS', targetUrl: null };
    }
    if (query.includes('created today') || query.includes('today\'s links') || query.includes('links from today') || query.includes('added today') || query.includes('links created today')) {
      logger.info('IntentClassifier: DB_CREATED_TODAY match');
      return { intent: 'DB_CREATED_TODAY', targetUrl: null };
    }
    if (query.includes('workspaces') || query.includes('workspace list') || query.includes('list all workspaces')) {
      logger.info('IntentClassifier: DB_WORKSPACES match');
      return { intent: 'DB_WORKSPACES', targetUrl: null };
    }
    if (query.includes('folders') || query.includes('folder list') || query.includes('list folders')) {
      logger.info('IntentClassifier: DB_FOLDERS match');
      return { intent: 'DB_FOLDERS', targetUrl: null };
    }
    if (query.includes('password-protected') || query.includes('password protected') || query.includes('links with password') || query.includes('secured links') || query.includes('password protect')) {
      logger.info('IntentClassifier: DB_PASSWORD_PROTECTED match');
      return { intent: 'DB_PASSWORD_PROTECTED', targetUrl: null };
    }
    const domainMatch = query.match(/(?:show|find|list|get|search)\s+(?:all\s+)?([a-zA-Z0-9.-]+)\s+links/i) ||
                        query.match(/(?:show|find|list|get|search)\s+links\s+(?:from|for)\s+([a-zA-Z0-9.-]+)/i);
    if (domainMatch) {
      const domainKeyword = domainMatch[1].trim();
      logger.info(`IntentClassifier: DB_GENERIC_DOMAIN_SEARCH match for: ${domainKeyword}`);
      return { intent: 'DB_GENERIC_DOMAIN_SEARCH', domainKeyword, targetUrl: null };
    }

    if (query.includes('list all links') || query.includes('show all links') || query.includes('list links') || query === 'my links' || query.includes('show my links')) {
      logger.info('IntentClassifier: DB_ALL_LINKS match');
      return { intent: 'DB_ALL_LINKS', targetUrl: null };
    }
    let intent = 'GENERAL_CONVERSATION';
    const greetings = ['hi', 'hello', 'hey', 'how are you', 'good morning', 'good afternoon', 'greetings'];
    const isGreeting = greetings.some(g => query === g || query.startsWith(g + ' '));

    if (isGreeting) {
      intent = 'GREETING';
    } else if (query.includes('analyze my dashboard') || query.includes('dashboard report') || query.includes('workspace summary') || query.includes('business report') || query.includes('dashboard summary')) {
      intent = 'DASHBOARD_ANALYSIS';
    } else if (query.includes('linkedin') || query.includes('twitter') || query.includes('instagram') || query.includes('facebook') || query.includes('marketing') || query.includes('post') || query.includes('caption') || query.includes('campaign')) {
      intent = 'MARKETING';
    } else if (query.includes('predict') || query.includes('forecast') || query.includes('future') || query.includes('next week') || query.includes('next month')) {
      intent = 'PREDICTION';
    } else if (query.includes('safe') || query.includes('security') || query.includes('phishing') || query.includes('threat') || query.includes('malicious') || query.includes('ssl')) {
      intent = 'SECURITY_ANALYSIS';
    } else if (query.includes('health') || query.includes('broken') || query.includes('expired') || query.includes('duplicate') || query.includes('zero clicks') || query.includes('0 clicks')) {
      intent = 'URL_MANAGEMENT';
    } else if (query.includes('recommend') || query.includes('improve') || query.includes('what should i do') || query.includes('optimization')) {
      intent = 'RECOMMENDATIONS';
    } else if (query.includes('top') || query.includes('best') || query.includes('most clicked') || query.includes('highest traffic') || query.includes('trending') || query.includes('least') || query.includes('worst') || query.includes('never clicked')) {
      intent = 'LINK_PERFORMANCE';
    } else if (targetUrl || query.includes('clicks for') || query.includes('clicks on') || query.includes('how many clicks') || query.includes('performance of')) {
      intent = 'SPECIFIC_LINK_QUESTION';
    } else if (query.includes('clicks') || query.includes('visitor') || query.includes('average') || query.includes('today') || query.includes('geographical') || query.includes('device') || query.includes('browser') || query.includes('country') || query.includes('daily traffic')) {
      intent = 'ANALYTICS_QUERIES';
    }

    if (query === 'why?' || query === 'why' || query.startsWith('explain why') || query.startsWith('explain more')) {
      intent = 'SPECIFIC_LINK_QUESTION';
      if (discussedShortcodes.length > 0 && !targetUrl) {
        targetUrl = urls.find(u => u.shortCode === discussedShortcodes[0]);
      }
    }

    logger.info('IntentClassifier resolved intent: ' + intent + ' (target URL resolved: ' + (targetUrl ? targetUrl.shortCode : 'None') + ')');
    return { intent, targetUrl };
  }
}
