document.addEventListener('DOMContentLoaded', function() {
    
    const thoughts = [
        { text: "Bharatanatyam is the yoga of dance—where breath, movement, and emotion become one.", author: "Rukmini Devi Arundale" },
        { text: "When the feet move in rhythm, the soul moves toward liberation.", author: "Mallika Sarabhai" },
        { text: "Bharatanatyam is not a mere performance; it is an offering, a prayer in motion.", author: "Balasaraswati" },
        { text: "The dancer who truly surrenders to Bharatanatyam is no longer a performer but a messenger of the divine.", author: "Leela Samson" },
        { text: "Nataraja’s dance is not just destruction, but the cosmic cycle of creation, preservation, and transformation.", author: "Ananda Coomaraswamy" },
        { text: "In Bharatanatyam, the body speaks, the mind listens, and the soul rejoices.", author: "Padma Subrahmanyam" },
        { text: "Each hasta (hand gesture) in Bharatanatyam is a verse, each movement a hymn.", author: "Bharata Muni" },
        { text: "Shiva dances to the rhythm of the universe, and the universe dances to the rhythm of Shiva.", author: "Swami Sivananda" },
        { text: "Bharatanatyam is a living scripture, telling stories that transcend time and space.", author: "Mrinalini Sarabhai" },
        { text: "The dancer is not separate from the dance—like the river is not separate from its flow.", author: "Ancient Tamil Saying" },
        { text: "Om Namah Shivaya—the sacred chant mirrors the rhythm of Nataraja’s cosmic dance.", author: "Shaivite Tradition" },
        { text: "Through Bharatanatyam, the devotee merges into the deity, just as sound merges into silence.", author: "Tirumular" },
        { text: "Where music is the heartbeat, Bharatanatyam is the soul’s expression.", author: "Yamini Krishnamurthy" },
        { text: "The temple walls have heard the anklet bells of thousands of dancers, each carrying a story of devotion.", author: "E. Krishna Iyer" },
        { text: "Like the lotus that blooms in still waters, Bharatanatyam flourishes in the depths of discipline and grace.", author: "Bharatanatyam Adage" },
        { text: "Dance is the bridge between the seen and the unseen, between the human and the divine.", author: "Hindu Scripture" },
        { text: "The sound of the damaru is not just music; it is the vibration of existence itself.", author: "Ancient Vedic Text" },
        { text: "Bharatanatyam is meditation in movement, where the soul finds stillness in the rhythm of devotion.", author: "Mallika Sarabhai" },
        { text: "Natya (dance) is not mere entertainment; it is the very expression of the cosmos.", author: "Bharata Muni" },
        { text: "In the flicker of an eye, in the gesture of a hand, the universe unfolds in Bharatanatyam.", author: "Leela Samson" },
        { text: "Bharatanatyam is the divine poetry of motion, written on the canvas of time.", author: "Rukmini Devi Arundale" },
        { text: "Every atom in creation is in motion, and Bharatanatyam is a reflection of this eternal dance.", author: "Fritjof Capra" },
        { text: "Through rhythm, expression, and devotion, the dancer dissolves into the dance, and the dance becomes worship.", author: "Bharatanatyam Proverb" },
        { text: "When the body becomes an instrument of devotion, dance becomes a form of prayer.", author: "Ancient Sanskrit Saying" }
    ];
    

    const thoughtText = document.querySelector(".thought-box p");
    const thoughtAuthor = document.querySelector(".thought-box .author");

    if (!thoughtText || !thoughtAuthor) {
        console.error("Error: Unable to find elements.");
        return;
    }

    let today = new Date().toISOString().split("T")[0];
    let storedDate = localStorage.getItem("thoughtDate");
    let storedThought = localStorage.getItem("dailyThought");

    // Ensure storedThought is valid JSON, else reset it
    try {
        storedThought = storedThought ? JSON.parse(storedThought) : null;
    } catch (error) {
        console.error("Invalid JSON in localStorage, resetting...", error);
        storedThought = null;
    }

    if (storedDate !== today || !storedThought) {
        let randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
        localStorage.setItem("dailyThought", JSON.stringify(randomThought));
        localStorage.setItem("thoughtDate", today);
        storedThought = randomThought;
    }

    thoughtText.textContent = `"${storedThought.text}"`;
    thoughtAuthor.textContent = `${storedThought.author}`;

    
    
    // Get the logout button
    const logoutBtn = document.getElementById('logout-btn');

    // Add click event listener to logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault(); // Prevent the default anchor behavior

            try {
                // Make a request to the logout endpoint
                const response = await fetch('/logout', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin' // Important for sending cookies
                });

                if (response.ok) {
                    // If logout was successful, redirect to login page
                    window.location.href = '/login';
                } else {
                    console.error('Logout failed');
                    alert('Failed to logout. Please try again.');
                }
            } catch (error) {
                console.error('Error during logout:', error);
                alert('An error occurred during logout. Please try again.');
            }
        });
    }

    // Add any other dashboard functionality here
    // For example, handling phone calls, etc.
    // Notification functionality is handled in student-dashboard.ejs
});