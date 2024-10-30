chrome.alarms.create("fetchBreakingNews", { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchBreakingNews") {
    chrome.storage.sync.get(["topics"], async function (data) {
      if (data.topics && data.topics.length > 0) {
        const responses = await Promise.all(
          data.topics.map((topic) =>
            fetch(
              `https://newsapi.org/v2/top-headlines?q=${topic}&apiKey=${NEWS_API_KEY}`
            )
          )
        );
        const articles = (await Promise.all(responses.map((res) => res.json())))
          .flatMap((data) => data.articles)
          .slice(0, 1); // Limit to 1 breaking news article

        articles.forEach((article) => {
          chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-news-48.png",
            title: article.title,
            message: article.description || "Breaking news!",
            buttons: [{ title: "Read more" }],
            isClickable: true,
          });
        });
      }
    });
  }
});
