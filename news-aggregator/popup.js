const NEWS_API_URL = "http://localhost:3000/news"; // Local proxy URL
const OPENAI_API_KEY = ""; // OpenAI API Key for sentiment analysis

// Function to get sentiment score for article title
async function getSentimentScore(articleTitle) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: `Rate sentiment of this title (1 to 10): "${articleTitle}"` }],
        temperature: 0
      })
    });

    const data = await response.json();
    const sentimentScore = data.choices[0].message.content.trim();
    return sentimentScore; // Returning sentiment score directly
  } catch (error) {
    console.error("Error fetching sentiment score:", error);
    return null;
  }
}

// Updated fetchNews function
async function fetchNews(topics) {
  const newsFeed = document.getElementById("news-feed");
  newsFeed.innerHTML = "<p>Loading news...</p>";

  try {
    // Fetch news articles from local proxy server
    const responses = await Promise.all(
      topics.map(topic =>
        fetch(`${NEWS_API_URL}?q=${topic}`)
      )
    );

    const dataResponses = await Promise.all(responses.map(async (res) => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    }));

    const articles = dataResponses.flatMap(data => data.articles).slice(0, 10);

    // Add sentiment scores to articles
    const articlesWithSentiment = await Promise.all(articles.map(async (article) => {
      const positivityScore = await getSentimentScore(article.title);
      return { ...article, positivityScore };
    }));

    // Display articles in the news feed
    if (articlesWithSentiment.length > 0) {
      newsFeed.innerHTML = articlesWithSentiment.map(article => `
        <div class="news-item">
          <img class="news-image" src="${article.urlToImage}" alt="${article.title}">
          <h3>${article.title}</h3>
          <p>${article.description || "No description available."}</p>
          <p><em>Source: ${article.source.name || "Unknown"}</em></p>
          <p>Positivity Score: ${article.positivityScore}/10</p>
          <button onclick="saveFavorite('${article.url}')">Save Article</button>
          <a href="${article.url}" target="_blank">Read more</a>
        </div>
      `).join("");
    } else {
      newsFeed.innerHTML = "<p>No articles found.</p>";
    }
  } catch (error) {
    console.error("Error fetching news:", error);
    newsFeed.innerHTML = "<p>Failed to load news. Check console for details.</p>";
  }
}

// Function to save favorite articles
function saveFavorite(url) {
  chrome.storage.sync.get(["favorites"], function (data) {
    const favorites = data.favorites || [];
    
    // Check if the article is already in favorites
    if (!favorites.includes(url)) {
      favorites.push(url); // Add new article URL
      chrome.storage.sync.set({ favorites }, () => {
        alert("Article saved to favorites!");
        loadFavorites(); // Refresh favorites display with the updated list
      });
    } else {
      alert("This article is already in your favorites."); // Alert if already exists
    }
  });
}

// Function to remove a favorite article
function removeFavorite(url) {
  chrome.storage.sync.get(["favorites"], function (data) {
    const favorites = data.favorites || [];
    const updatedFavorites = favorites.filter(fav => fav !== url); // Remove the specific article
    chrome.storage.sync.set({ favorites: updatedFavorites }, () => {
      alert("Article removed from favorites!");
      loadFavorites(); // Refresh favorites display with the updated list
    });
  });
}

// Load and display saved favorite articles
function loadFavorites() {
  chrome.storage.sync.get(["favorites"], function (data) {
    const favorites = data.favorites || [];
    const favoriteContainer = document.getElementById("favorite-articles");

    if (favorites.length === 0) {
      favoriteContainer.innerHTML = "<p>No saved articles.</p>";
    } else {
      favoriteContainer.innerHTML = favorites.map(url => `
        <div class="favorite-item">
          <h4>${url}</h4>
          <button onclick="removeFavorite('${url}')">Remove</button>
        </div>
      `).join("");
    }
  });
}

// Load topics and fetch news on extension load
document.addEventListener("DOMContentLoaded", function () {
  const topicSelect = document.getElementById("topic-select");
  const saveButton = document.getElementById("save-settings");
  const refreshButton = document.getElementById("refresh-news");

  // Load saved topics and fetch news on startup
  chrome.storage.sync.get(["topics"], function (data) {
    if (data.topics) {
      data.topics.forEach((topic) => {
        for (let option of topicSelect.options) {
          if (option.value === topic) {
            option.selected = true;
          }
        }
      });
      fetchNews(data.topics);
    }
    loadFavorites(); // Load favorites on startup
  });

  // Save selected topics and refresh news feed
  saveButton.addEventListener("click", () => {
    const selectedTopics = Array.from(topicSelect.selectedOptions).map(
      (option) => option.value
    );
    chrome.storage.sync.set({ topics: selectedTopics }, () => {
      alert("Topics saved!");
      fetchNews(selectedTopics);
    });
  });

  // Refresh news feed manually
  refreshButton.addEventListener("click", () => {
    const selectedTopics = Array.from(topicSelect.selectedOptions).map(
      (option) => option.value
    );
    fetchNews(selectedTopics);
  });
});
