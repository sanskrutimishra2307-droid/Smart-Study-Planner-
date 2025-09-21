const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');
const alarmSound = document.getElementById('alarmSound');
const colorTheme = document.getElementById('colorTheme');
const scheduleBtn = document.getElementById('scheduleBtn');
const scheduleSection = document.getElementById('scheduleSection');
const modeToggle = document.getElementById('modeToggle');
const showTimer = document.getElementById('showTimer');
const timerContainer = document.querySelector('.timer-container');
const timerDisplay = document.getElementById('timerDisplay');
const timerStart = document.getElementById('timerStart');
const timerReset = document.getElementById('timerReset');
const progressFill = document.getElementById('progressFill');
const tasksCompleted = document.getElementById('tasksCompleted');
const progressPercent = document.getElementById('progressPercent');
const taskFilters = document.querySelectorAll('.task-filters button');
const currentDateElement = document.getElementById('currentDate');
const currentTimeElement = document.getElementById('currentTime');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentTimer = 1500; // 25 minutes in seconds
let timerInterval = null;
let isTimerRunning = false;
let timeUpdateInterval = null;

// ----- Date and Time Display -----
function updateDateTime() {
    const now = new Date();
    
    // Format date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    // Format time
    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;
    
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    // Update elements
    currentDateElement.textContent = dateString;
    currentTimeElement.textContent = timeString;
}

// ----- Save & Render Tasks -----
function saveTasks(){ 
    localStorage.setItem('tasks', JSON.stringify(tasks)); 
    updateProgress();
}

function updateProgress() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    progressFill.style.width = `${progress}%`;
    tasksCompleted.textContent = `${completedTasks}/${totalTasks} tasks`;
    progressPercent.textContent = `${Math.round(progress)}%`;
}

function renderTasks(filter = 'all'){
    taskList.innerHTML='';
    const now = new Date();
    
    let filteredTasks = tasks;
    if (filter === 'pending') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }
    
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No tasks found. Add some tasks to get started!</p>';
        return;
    }
    
    filteredTasks.forEach((task,index)=>{
        const li = document.createElement('li');
        li.className = task.completed ? 'completed' : '';
        li.draggable = true;
        li.dataset.index = index;
        
        const icon = task.type === 'Study' ? 'book' : 
                    task.type === 'Academic' ? 'graduation-cap' :
                    task.type === 'Extracurricular' ? 'running' :
                    task.type === 'Assignment' ? 'file-alt' : 'clipboard-list';
        
        li.innerHTML = `
            <div class="task-title">
                <i class="fas fa-${icon}"></i> ${task.title}
            </div>
            ${task.desc ? `<div class="task-desc">${task.desc}</div>` : ''}
            <div class="task-meta">
                <div><i class="far fa-calendar"></i> ${formatDate(task.date)} at ${task.time}</div>
                <span class="task-type">${task.type}</span>
            </div>
            <div class="task-buttons">
                <button onclick="toggleComplete(${index})"><i class="fas fa-${task.completed ? 'undo' : 'check'}"></i></button>
                <button onclick="deleteTask(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Make task draggable
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            li.classList.add('dragging');
        });
        
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
        });
        
        taskList.appendChild(li);

        // Alarm check
        const taskDateTime = new Date(task.date+'T'+task.time);
        if(!task.alerted && now >= taskDateTime){
            showNotification(`${task.title} is due now!`);
            alarmSound.play();
            task.alerted = true;
            saveTasks();
        }
    });
}

function formatDate(dateString) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function toggleComplete(index){ 
    tasks[index].completed = !tasks[index].completed; 
    
    // Add animation class
    const taskElement = document.querySelector(`li[data-index="${index}"]`);
    if (taskElement) {
        taskElement.classList.add('task-complete-animation');
        setTimeout(() => {
            taskElement.classList.remove('task-complete-animation');
        }, 500);
    }
    
    saveTasks(); 
    renderTasks(document.querySelector('.task-filters button.active').dataset.filter);
}

function deleteTask(index){ 
    if (confirm("Are you sure you want to delete this task?")) {
        tasks.splice(index,1); 
        saveTasks(); 
        renderTasks(document.querySelector('.task-filters button.active').dataset.filter);
    }
}

taskForm.addEventListener('submit',function(e){
    e.preventDefault();
    const newTask = {
        title: document.getElementById('taskTitle').value,
        desc: document.getElementById('taskDesc').value,
        date: document.getElementById('taskDate').value,
        time: document.getElementById('taskTime').value,
        type: document.getElementById('taskType').value,
        completed: false, 
        alerted: false
    };
    tasks.push(newTask);
    saveTasks(); 
    renderTasks(document.querySelector('.task-filters button.active').dataset.filter); 
    taskForm.reset();
    
    // Set today's date as default for the date input
    document.getElementById('taskDate').valueAsDate = new Date();
    
    // Show confirmation
    showNotification(`"${newTask.title}" added successfully!`);
});

// Task filtering
taskFilters.forEach(button => {
    button.addEventListener('click', () => {
        taskFilters.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderTasks(button.dataset.filter);
    });
});

// Drag and drop for task reordering
taskList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(taskList, e.clientY);
    const draggable = document.querySelector('.dragging');
    if (draggable) {
        if (afterElement == null) {
            taskList.appendChild(draggable);
        } else {
            taskList.insertBefore(draggable, afterElement);
        }
    }
});

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('li:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ----- Mode Toggle -----
modeToggle.addEventListener('click',()=>{ 
    document.body.classList.toggle('dark'); 
    if (document.body.classList.contains('dark')) {
        modeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    } else {
        modeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
});

// ----- Color Theme -----
colorTheme.addEventListener('change',(e)=>{
    // Remove all theme classes
    document.body.classList.remove('theme-mint', 'theme-blue', 'theme-lavender', 'theme-beige');
    
    // Add the selected theme class
    document.body.classList.add(`theme-${e.target.value}`);
});

// ----- Scheduler -----
scheduleBtn.addEventListener('click',()=>{
    scheduleSection.innerHTML=`
    <div class="card">
        <h2><i class="fas fa-calendar-alt"></i> Generate Daily Timetable</h2>
        <form id="scheduleForm">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label for="startTime">Start Time</label>
                    <input type="time" id="startTime" value="09:00" required>
                </div>
                <div class="form-group">
                    <label for="endTime">End Time</label>
                    <input type="time" id="endTime" value="17:00" required>
                </div>
            </div>
            <div class="form-group">
                <label for="subjects">Subjects (comma separated)</label>
                <input type="text" id="subjects" placeholder="Math, Physics, Chemistry, Biology" required>
            </div>
            <button type="submit"><i class="fas fa-magic"></i> Generate Timetable</button>
        </form>
        <div id="timetableOutput" style="margin-top: 20px;"></div>
    </div>
    `;
    document.getElementById('scheduleForm').addEventListener('submit',(e)=>{
        e.preventDefault();
        generateTimetable();
    });
});

function generateTimetable(){
    const start=document.getElementById('startTime').value.split(':');
    const end=document.getElementById('endTime').value.split(':');
    const subjects=document.getElementById('subjects').value.split(',').map(s=>s.trim());
    const timetableOutput=document.getElementById('timetableOutput');
    timetableOutput.innerHTML='';

    const startM=parseInt(start[0])*60+parseInt(start[1]);
    const endM=parseInt(end[0])*60+parseInt(end[1]);
    const totalM=endM-startM;

    if (totalM <= 0) {
        timetableOutput.innerHTML = '<p style="color: red; text-align: center;">End time must be after start time!</p>';
        return;
    }

    const breakM = 15; // 15 minutes break between subjects
    const blockM = Math.floor((totalM - breakM*(subjects.length-1)) / subjects.length);

    if (blockM < 15) {
        timetableOutput.innerHTML = '<p style="color: red; text-align: center;">Not enough time for all subjects! Try fewer subjects or extend your study time.</p>';
        return;
    }

    let currentM=startM;
    let table='<h3>Your Study Schedule</h3><table class="timetable"><tr><th>Time</th><th>Activity</th></tr>';

    // Pastel colors for subjects
    const colors = ['#f0fdf4','#f0f4ff','#f7f0ff','#fff8e7','#ffe0f0','#fcefcf','#d0f0fd'];
    subjects.forEach((sub,i)=>{
        let sh=Math.floor(currentM/60), sm=currentM%60;
        currentM+=blockM;
        let eh=Math.floor(currentM/60), em=currentM%60;
        const color = colors[i % colors.length];
        table+=`<tr style="background:${color}"><td>${sh.toString().padStart(2,'0')}:${sm.toString().padStart(2,'0')} - ${eh.toString().padStart(2,'0')}:${em.toString().padStart(2,'0')}</td><td>${sub}</td></tr>`;

        if(i < subjects.length-1){
            currentM+=breakM;
            let bsh=Math.floor((currentM-breakM)/60), bsm=(currentM-breakM)%60;
            let beh=Math.floor(currentM/60), bem=currentM%60;
            table+=`<tr style="background:#f5f5f5"><td>${bsh.toString().padStart(2,'0')}:${bsm.toString().padStart(2,'0')} - ${beh.toString().padStart(2,'0')}:${bem.toString().padStart(2,'0')}</td><td><i class="fas fa-coffee"></i> Break</td></tr>`;
        }
    });
    table+='</table>';
    timetableOutput.innerHTML=table;
}

// ----- Study Timer -----
showTimer.addEventListener('click', () => {
    timerContainer.style.display = timerContainer.style.display === 'none' ? 'flex' : 'none';
});

function startTimer() {
    if (isTimerRunning) return;
    
    isTimerRunning = true;
    timerStart.textContent = 'Pause';
    
    timerInterval = setInterval(() => {
        currentTimer--;
        
        const minutes = Math.floor(currentTimer / 60);
        const seconds = currentTimer % 60;
        
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (currentTimer <= 0) {
            clearInterval(timerInterval);
            showNotification('Timer completed! Take a break.');
            alarmSound.play();
            resetTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerStart.textContent = 'Resume';
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    currentTimer = 1500; // 25 minutes
    timerDisplay.textContent = '25:00';
    timerStart.textContent = 'Start';
}

timerStart.addEventListener('click', () => {
    if (isTimerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

timerReset.addEventListener('click', resetTimer);

// ----- Notification System -----
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-bell"></i>
        <div class="notification-content">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// ----- Alarm Checker -----
setInterval(() => {
    renderTasks(document.querySelector('.task-filters button.active').dataset.filter);
}, 60000); // Check every 1 min

// Initialize
updateDateTime(); // Initialize date/time display
timeUpdateInterval = setInterval(updateDateTime, 1000); // Update time every second
renderTasks();
updateProgress();

// Set today's date as default for the date input
document.getElementById('taskDate').valueAsDate = new Date();