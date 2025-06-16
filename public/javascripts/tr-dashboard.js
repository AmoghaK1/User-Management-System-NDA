document.addEventListener('DOMContentLoaded', function () {
    
    const thoughts = [
        { text: "Believe in yourself. You are braver than you think.", author: "Roy T. Bennett" },
        { text: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
        { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" }
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
    
    
   
    const eventsCard = document.getElementById('events-btn');
    const deleteStudentModal = document.getElementById('deleteStudentModal');
    const studentList = document.getElementById('studentList');
    const confirmation = document.getElementById('confirmation');
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    const closeModal = document.querySelector('.close');

    let selectedStudentId = null;

   

    eventsCard.addEventListener('click', function(event){
        alert("Events will be available soon!");    
    })
    // Function to fetch and display students
    async function fetchStudents() {
        try {
            console.log("Fetching students..."); // Debugging
            const response = await fetch('/get-all-students');
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error fetching students:", errorText); // Debugging
                throw new Error(`Server error: ${response.status}`);
            }

            const students = await response.json();
            console.log("Students fetched successfully:", students); // Debugging

            studentList.innerHTML = ''; // Clear previous list
            students.forEach(student => {
                const studentItem = document.createElement('div');
                studentItem.className = 'student-item';
                studentItem.textContent = student.name;
                studentItem.dataset.id = student._id;
                studentList.appendChild(studentItem);
            });
        } catch (error) {
            console.error("Error fetching students:", error); // Debugging
            alert("Error fetching students. Check the console for details.");
        }
    }

    // Open modal and fetch students
    document.querySelector('#deleteStudentCard').addEventListener('click', function () {
        console.log("Delete student button clicked"); // Debugging
        deleteStudentModal.style.display = 'block';
        fetchStudents();
    });

    // Close modal
    closeModal.addEventListener('click', function () {
        console.log("Modal closed"); // Debugging
        deleteStudentModal.style.display = 'none';
        confirmation.style.display = 'none';
    });

    // Select student
    studentList.addEventListener('click', function (e) {
        if (e.target.classList.contains('student-item')) {
            selectedStudentId = e.target.dataset.id;
            console.log("Student selected for deletion:", selectedStudentId); // Debugging
            confirmation.style.display = 'block';
        }
    });



    // Confirm deletion
    confirmDeleteBtn.addEventListener('click', async function () {
        if (selectedStudentId) {
            try {
                console.log("Attempting to delete student with ID:", selectedStudentId); // Debugging
                const response = await fetch('/delete-student', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ studentId: selectedStudentId }),
                });

                console.log("Response status:", response.status); // Debugging

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Server error:", errorText); // Debugging
                    throw new Error(`Server error: ${response.status}`);
                }

                const result = await response.json();
                console.log("Delete student response:", result); // Debugging

                if (result.success) {
                    alert('Student deleted successfully');
                    fetchStudents(); // Refresh the list
                    confirmation.style.display = 'none';
                } else {
                    alert('Error deleting student: ' + result.error);
                }
            } catch (error) {
                console.error("Error deleting student:", error); // Debugging
                alert('Error deleting student: ' + error.message);
            }
        }
    });

    // Cancel deletion
    cancelDeleteBtn.addEventListener('click', function () {
        console.log("Deletion cancelled"); // Debugging
        confirmation.style.display = 'none';
    });
});