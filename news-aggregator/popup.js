const NEWS_API_URL = "http://localhost:3000/news"; // Use your proxy server

// Function to fetch news based on selected topics
async function fetchNews(topics) {
    const newsFeed = document.getElementById("news-feed");
    newsFeed.innerHTML = "<p>Loading news...</p>"; // Show loading text

    try {
        const responses = await Promise.all(
            topics.map((topic) =>
                fetch(`${NEWS_API_URL}?topic=${topic}`) // Use proxy server
            )
        );

        const dataResponses = await Promise.all(responses.map(async (res) => {
            if (!res.ok) {
                console.error(`HTTP error! status: ${res.status}`);
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return await res.json();
        }));

        const articles = dataResponses.flatMap((data) => {
            if (!data.articles) {
                return []; // Return empty if articles are undefined
            }
            return data.articles; // Return articles if available
        }).slice(0, 10); // Limit to 10 articles

        // Populate the news feed with articles
        if (articles.length > 0) {
            newsFeed.innerHTML = articles
                .map((article) =>
                    `<div class="news-item" data-url="${article.url}">
                       <img src="${article.urlToImage}" alt="${article.title}" class="news-image" />
                       <h3>${article.title}</h3>
                       <p>${article.description || "No description available."}</p>
                       <p><em>Source: ${article.source.name || 'Unknown'}</em></p>
                       <button class="save-favorite">Save Favorite</button>
                       <a href="${article.url}" target="_blank">Read more</a>
                     </div>`
                ).join("");

            // Add event listeners for saving favorites
            document.querySelectorAll(".save-favorite").forEach(button => {
                button.addEventListener("click", function () {
                    const articleUrl = this.closest(".news-item").getAttribute("data-url");
                    saveFavorite(articleUrl); // Save favorite and update UI instantly
                });
            });
        } else {
            newsFeed.innerHTML = "<p>No articles found.</p>"; // If no articles were returned
        }
    } catch (error) {
        console.error("Error fetching news:", error);
        newsFeed.innerHTML = "<p>Failed to load news. Check console for details.</p>"; // Show error message
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
                loadFavorites(); // Refresh favorites display
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
            loadFavorites(); // Refresh favorites display
        });
    });
}

// Function to load and display saved topics and favorites
async function loadSavedTopicsAndFavorites() {
    const topicSelect = document.getElementById("topic-select");
    const saveButton = document.getElementById("save-settings");
    const refreshButton = document.getElementById("refresh-news");

    // Load saved topics on startup
    chrome.storage.sync.get(["topics", "favorites"], function (data) {
        if (data.topics) {
            data.topics.forEach((topic) => {
                for (let option of topicSelect.options) {
                    if (option.value === topic) {
                        option.selected = true; // Select saved topics
                    }
                }
            });
            // Fetch news for the saved topics
            fetchNews(data.topics);
        }

        // Load saved favorite articles
        loadFavorites(data.favorites);
    });

    // Save selected topics and refresh the news feed
    saveButton.addEventListener("click", () => {
        const selectedTopics = Array.from(topicSelect.selectedOptions).map(
            (option) => option.value
        );

        chrome.storage.sync.set({ topics: selectedTopics }, () => {
            alert("Topics saved!"); // Confirmation message
            // Fetch news for the newly saved topics
            fetchNews(selectedTopics);
        });
    });

    // Refresh news feed on button click
    refreshButton.addEventListener("click", () => {
        const selectedTopics = Array.from(topicSelect.selectedOptions).map(
            (option) => option.value
        );
        fetchNews(selectedTopics); // Fetch news again
    });
}

// Function to load and display favorite articles
function loadFavorites(favorites = []) {
    const favoritesSection = document.getElementById("favorite-articles");
    favoritesSection.innerHTML = '';
    if (favorites && favorites.length > 0) {
        favorites.forEach((url) => {
            favoritesSection.innerHTML += `
                <div class="favorite-item" data-url="${url}">
                    <a href="${url}" target="_blank">${url}</a>
                    <button class="remove-favorite">Remove</button>
                </div>
            `;
        });

        // Attach event listeners to remove buttons
        document.querySelectorAll('.remove-favorite').forEach(button => {
            button.addEventListener('click', function () {
                const articleUrl = this.closest('.favorite-item').getAttribute('data-url');
                removeFavorite(articleUrl); // Call remove function
            });
        });
    } else {
        favoritesSection.innerHTML = "<p>No favorite articles found.</p>";
    }
}

// Load saved topics and favorites when the document is ready
document.addEventListener("DOMContentLoaded", loadSavedTopicsAndFavorites);
