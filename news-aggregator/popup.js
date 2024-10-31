const PROXY_URL = "http://localhost:3000"; // Your proxy URL
const DEFAULT_PAGE_SIZE = 10; // Limit to 10 articles for performance
let currentCategory = ''; // Store current selected category

// Function to get sentiment score for article title
async function getSentimentScore(articleTitle) {
    try {
        const response = await fetch(`${PROXY_URL}/analyze-sentiment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: articleTitle })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const rawScore = data.sentimentScore; // Adjust based on your API's response structure
        if (rawScore !== undefined && rawScore !== null) {
            const positivityScore = Math.round(((rawScore + 1) / 2) * 9) + 1; // Scaled 1-10
            return positivityScore;
        } else {
            console.warn("Sentiment score not found in response:", data);
            return null; // Or a default value
        }
    } catch (error) {
        console.error("Error fetching sentiment score:", error);
        return null; // Return null if there's an error
    }
}

// Function to fetch news articles based on category
async function fetchNews(category, page = 1) {
    const newsFeed = document.getElementById("news-feed");
    newsFeed.innerHTML = "<p>Loading news...</p>"; // Loading indicator

    try {
        const response = await fetch(`${PROXY_URL}/news?topic=${category}&page=${page}&pageSize=${DEFAULT_PAGE_SIZE}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const articles = data.articles; // Get all articles

        // Add sentiment scores to articles
        const articlesWithSentiment = await Promise.all(articles.map(async (article) => {
            const positivityScore = await getSentimentScore(article.title);
            return { ...article, positivityScore };
        }));

        // Clear previous articles before displaying new ones
        newsFeed.innerHTML = ""; 

        // Display articles in the news feed
        if (articlesWithSentiment.length > 0) {
            articlesWithSentiment.forEach(article => {
                const newsItem = document.createElement("div");
                newsItem.className = "news-item";
                newsItem.innerHTML = `
                    <img class="news-image" src="${article.urlToImage}" alt="${article.title}">
                    <h3>${article.title}</h3>
                    <p>${article.description || "No description available."}</p>
                    <p><em>Source: ${article.source.name || "Unknown"}</em></p>
                    <p>Positivity Score: ${article.positivityScore !== null ? article.positivityScore : "N/A"}/10</p>
                    <button class="save-button" data-url="${article.url}">Save to Favorites</button>
                    <a href="${article.url}" target="_blank">Read more</a>
                `;
                newsFeed.appendChild(newsItem); // Add the news item to the news feed

                // Add event listener for save button
                const button = newsItem.querySelector('.save-button');
                button.addEventListener('click', () => saveFavorite(article.url));
            });
        } else {
            newsFeed.innerHTML = "<p>No articles found.</p>";
        }
    } catch (error) {
        console.error("Error fetching news:", error);
        newsFeed.innerHTML = "<p>Failed to load news. Check console for details.</p>"; // Improved error handling
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
                loadFavorites(favorites); // Refresh favorites display with the updated list
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
            loadFavorites(updatedFavorites); // Refresh favorites display with the updated list
        });
    });
}

// Load and display favorite articles
function loadFavorites(favorites) {
    const favoriteArticles = document.getElementById("favorite-articles");
    favoriteArticles.innerHTML = ""; // Clear existing favorites
    
    if (favorites.length > 0) {
        favorites.forEach(url => {
            const favoriteItem = document.createElement("div");
            favoriteItem.className = "favorite-item";
            favoriteItem.innerHTML = `
                <a href="${url}" target="_blank">${url}</a>
                <button class="remove-button" data-url="${url}">Remove</button>
            `;
            favoriteArticles.appendChild(favoriteItem);

            // Add event listener to remove button
            const removeButton = favoriteItem.querySelector(".remove-button");
            removeButton.addEventListener('click', () => removeFavorite(url));
        });
    } else {
        favoriteArticles.innerHTML = "<p>No favorite articles saved.</p>";
    }
}

// Load topics and fetch news on extension load
document.addEventListener("DOMContentLoaded", function () {
    const categorySelect = document.getElementById("category-select");
    const saveButton = document.getElementById("save-settings");
    const refreshButton = document.getElementById("refresh-news");
    const darkModeButton = document.getElementById("toggle-dark-mode");

    // Load saved categories and fetch news on startup
    chrome.storage.sync.get(["favorites", "darkMode"], function (data) {
        // Initialize favorites on startup
        if (data.favorites) {
            loadFavorites(data.favorites);
        }

        // Set dark mode based on stored preference
        if (data.darkMode) {
            document.body.classList.add("dark-mode");
            darkModeButton.textContent = "Toggle Light Mode";
        } else {
            darkModeButton.textContent = "Toggle Dark Mode";
        }
    });

    // Save selected category and fetch news
    saveButton.addEventListener("click", () => {
        const selectedCategory = categorySelect.value; // Get selected category
        if (selectedCategory !== currentCategory) {
            currentCategory = selectedCategory; // Update current category
            fetchNews(selectedCategory); // Fetch news for the selected category
        }
    });

    // Refresh news feed
    refreshButton.addEventListener("click", () => {
        fetchNews(currentCategory); // Refresh news with the currently selected category
    });

    // Toggle dark mode
    darkModeButton.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDarkMode = document.body.classList.contains("dark-mode");
        chrome.storage.sync.set({ darkMode: isDarkMode }); // Save the preference
        darkModeButton.textContent = isDarkMode ? "Toggle Light Mode" : "Toggle Dark Mode";
    });

    // Fetch news on load using default category (business)
    fetchNews(categorySelect.value);
});
