import logger from '../../../shared/logger/logger.js';

export class MockProvider {
  static generate(systemPrompt, history, contextJson, userQuery) {
    logger.info('MockProvider generating emulated response...');
    const query = userQuery.toLowerCase().trim();
    let data = { urls: [] };
    try {
      data = JSON.parse(contextJson);
    } catch (e) {}

    if (query === 'hi' || query === 'hello' || query === 'hey' || query.includes('how are you')) {
      return 'Hello! I am Bityl AI, your conversational Business Intelligence Consultant. I can analyze your workspace analytics logs, forecast traffic trends, audit routing safety, or generate tailored marketing content.\n\nHow can I assist you with your URL campaigns today?';
    }

    if (query.includes('predict') || query.includes('forecast')) {
      const link = data.selectedLink || (data.urls && data.urls[0]) || { shortCode: 'unknown', clicks: 0 };
      const p1 = Math.round(link.clicks * 0.15 + 2);
      const p2 = Math.round(link.clicks * 0.35 + 5);

      return '### 🔮 Click Trajectory Predictions: **/' + link.shortCode + '**\n\n' +
             '*   **Observation**: Click counts are projected at **' + p1 + ' clicks** tomorrow and **' + p2 + ' clicks** the day after.\n' +
             '*   **Explanation**: The model projects stable upward growth driven by high-converting tags on Twitter and LinkedIn. Confidence Margin stands at 92%.\n' +
             '*   **Recommendation**: Share this link on weekdays between 2 PM and 5 PM to capture the highest volume peak.\n' +
             '*   **Suggested Next Action**: Generate social media promotion assets to capture higher click volumes.\n\n' +
             '[LINK_CARD:' + link.shortCode + ']\n\n' +
             'Would you like marketing copies to help beat these click predictions?';
    }

    if (query.includes('marketing') || query.includes('post') || query.includes('linkedin')) {
      const link = data.selectedLink || (data.urls && data.urls[0]) || { shortCode: 'unknown', category: 'Technology', title: 'Developer Portal' };
      const shortUrl = 'https://bityl.glow/' + link.shortCode;
      return '### 📣 Bityl AI Marketing Campaign: **' + (link.title || link.shortCode) + '**\n\n' +
             '*   **Observation**: Tailoring campaign copies for /' + link.shortCode + ' based on its Category: *' + (link.category || 'Business') + '*.\n' +
             '*   **Explanation**: Using a professional campaign structure has historically boosted organic traffic acquisition on LinkedIn and Twitter.\n' +
             '*   **Recommendation**: Include relevant hashtags (#' + (link.category || 'Business').toLowerCase() + ') to increase organic visibility.\n' +
             '*   **Suggested Next Action**: Copy these templates directly from the grid below:\n\n' +
             '*   **LinkedIn Post**:\n    ```text\n    🚀 Check out this interesting resource under ' + (link.category || 'Business') + ': "' + (link.title || 'Developer Portal') + '". Highly recommended for professionals looking to optimize their workflow. Read more details here: ' + shortUrl + ' #ProfessionalGrowth #Workflow\n    ```\n\n' +
             '*   **Twitter / X Feed**:\n    ```text\n    💡 Just discovered this great link: "' + (link.title || 'Developer Portal') + '". Categorized under #' + (link.category || 'Business') + '. Check it out: ' + shortUrl + '\n    ```\n\n' +
             '*   **Email Campaign Subject**: `Handpicked Recommendation: ' + (link.title || 'Developer Portal') + '`\n\n' +
             '[LINK_CARD:' + link.shortCode + ']\n\n' +
             'Would you like me to write a custom CTA paragraph for another social channel?';
    }

    if (data.selectedLink) {
      const link = data.selectedLink;
      return '### 📈 Bityl AI Link Performance Audit: **' + (link.title || link.shortCode) + '**\n\n' +
             '*   **Observation**: This link has accumulated **' + link.clicks + ' total clicks** pointing to `' + link.originalUrl + '`.\n' +
             '*   **Explanation**: Categorized under *' + (link.category || 'Business') + '* with a health audit rating of ' + link.healthScore + '/100 and a safety score of ' + link.safetyScore + '/100. It is resolving securely, with direct traffic channels accounting for most acquisitions.\n' +
             '*   **Recommendation**: Rename this link alias to a descriptive name (e.g., `/learn-' + link.shortCode + '`) because descriptive aliases significantly build user trust and boost CTR.\n' +
             '*   **Suggested Next Action**: Let\'s set up an A/B split routing test for this campaign to optimize conversions.\n\n' +
             '[LINK_CARD:' + link.shortCode + ']\n\n' +
             'Would you like me to predict traffic growth for this link next week?';
    }

    const totalClicks = data.urls ? data.urls.reduce((sum, u) => sum + u.clicks, 0) : 0;
    const avgClicks = data.urls && data.urls.length > 0 ? Math.round(totalClicks / data.urls.length) : 0;
    const topCampaign = data.urls && data.urls.length > 0 ? [...data.urls].sort((a,b) => b.clicks - a.clicks)[0] : null;

    return '## 📊 Bityl AI Executive Business Report\n\n' +
           '*   **Observation**: Your workspace generated **' + totalClicks + ' clicks** across **' + (data.urls ? data.urls.length : 0) + ' shortened URLs**.\n' +
           '*   **Explanation**: Average clicks scale to **' + avgClicks + ' hits per URL**. Educational and business campaigns lead organic visitor conversions.\n' +
           (topCampaign ? '*   **Top Campaign Performer**: [LINK_CARD:' + topCampaign.shortCode + '] leading with **' + topCampaign.clicks + ' hits** classified in *' + (topCampaign.category || 'Business') + '*.\n' : '') +
           '*   **Recommendation**: Rename low-performing aliases and schedule updates during optimal time windows.\n' +
           '*   **Suggested Next Action**: Audit underperforming campaigns to prevent traffic loss.\n\n' +
           'Would you like me to analyze your underperforming links?';
  }
}
