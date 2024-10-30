const NEWS_API_KEY = ""; // Replace with your valid News API key

// Function to fetch news based on selected topics
async function fetchNews(topics) {
    const newsFeed = document.getElementById("news-feed");
    newsFeed.innerHTML = "<p>Loading news...</p>"; // Show loading text

    try {
        // Fetch news articles for each selected topic
        const responses = await Promise.all(
            topics.map((topic) =>
                fetch(`https://newsapi.org/v2/everything?q=${topic}&apiKey=${NEWS_API_KEY}`)
            )
        );

        // Check if all responses are OK
        const dataResponses = await Promise.all(responses.map(async (res) => {
            if (!res.ok) {
                console.error(`HTTP error! status: ${res.status}`);
                const errorText = await res.text(); // Get response text
                console.error(`Error response: ${errorText}`); // Log error response
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return await res.json();
        }));

        // Extract articles and flatten the results
        const articles = dataResponses.flatMap((data) => {
            if (!data.articles) {
                console.warn("No articles found in response:", data);
                return []; // Return empty if articles are undefined
            }
            return data.articles; // Return articles if available
        }).slice(0, 10); // Limit to 10 articles

        // Populate the news feed with articles
        if (articles.length > 0) {
            newsFeed.innerHTML = articles
                .map(
                    (article) =>
                        `<div class="news-item">
                           <img src="${article.urlToImage}" alt="${article.title}" style="width:100%; height:auto;"/>
                           <h3>${article.title}</h3>
                           <p>${article.description || "No description available."}</p>
                           <p><em>Source: ${article.source.name || 'Unknown'}</em></p>
                           <a href="${article.url}" target="_blank">Read more</a>
                         </div>`
                )
                .join("");
        } else {
            newsFeed.innerHTML = "<p>No articles found.</p>"; // If no articles were returned
        }
    } catch (error) {
        console.error("Error fetching news:", error); // Log the error message
        newsFeed.innerHTML = "<p>Failed to load news. Check console for details.</p>"; // Show error message
    }
}

// Function to load and display saved topics
document.addEventListener("DOMContentLoaded", function () {
    const topicSelect = document.getElementById("topic-select");
    const saveButton = document.getElementById("save-settings");

    // Load saved topics on startup
    chrome.storage.sync.get(["topics"], function (data) {
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
});
