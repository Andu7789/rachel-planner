// Course Planner Application
// Data Models and State Management

class CoursePlanner {
    constructor() {
        this.tutors = [];
        this.locations = [];
        this.courses = [];
        this.currentView = 'dashboard';
        this.calendarWeekOffset = 0;
        this.calendarViewMode = '4weeks';
        this.editingId = null;
        this.week1StartDate = null;

        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderDashboard();
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('coursePlannerData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.tutors = data.tutors || [];
            this.locations = data.locations || [];
            this.courses = data.courses || [];
            this.week1StartDate = data.week1StartDate || null;

            // Migrate old data if needed
            this.migrateOldAvailabilityData();
        }

        // Update the UI
        if (this.week1StartDate) {
            document.getElementById('week1-start-date').value = this.week1StartDate;
        }
        this.updateCurrentWeekDisplay();
    }

    migrateOldAvailabilityData() {
        // Check if we need to migrate from old day indexing (Mon=0) to new (Sun=0, Mon=1)
        // Old system: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
        // New system: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6

        let needsSave = false;

        // Migrate tutors
        this.tutors.forEach(tutor => {
            if (tutor.recurringAvailability && !tutor._migrated) {
                const oldAvailability = tutor.recurringAvailability;
                const newAvailability = {};

                Object.keys(oldAvailability).forEach(oldDay => {
                    const oldDayNum = parseInt(oldDay);
                    // Convert old index to new index
                    // Old: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
                    // New: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
                    const newDayNum = oldDayNum === 6 ? 0 : oldDayNum + 1;
                    newAvailability[newDayNum] = oldAvailability[oldDay];
                });

                tutor.recurringAvailability = newAvailability;
                tutor._migrated = true;
                needsSave = true;
            }
        });

        // Migrate locations
        this.locations.forEach(location => {
            if (location.recurringAvailability && !location._migrated) {
                const oldAvailability = location.recurringAvailability;
                const newAvailability = {};

                Object.keys(oldAvailability).forEach(oldDay => {
                    const oldDayNum = parseInt(oldDay);
                    const newDayNum = oldDayNum === 6 ? 0 : oldDayNum + 1;
                    newAvailability[newDayNum] = oldAvailability[oldDay];
                });

                location.recurringAvailability = newAvailability;
                location._migrated = true;
                needsSave = true;
            }
        });

        if (needsSave) {
            this.saveData();
        }
    }

    saveData() {
        const data = {
            tutors: this.tutors,
            locations: this.locations,
            courses: this.courses,
            week1StartDate: this.week1StartDate
        };
        localStorage.setItem('coursePlannerData', JSON.stringify(data));
    }

    getCurrentWeek() {
        if (!this.week1StartDate) return null;

        const startDate = new Date(this.week1StartDate);
        const today = new Date();
        const diffTime = today - startDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weekNumber = Math.floor(diffDays / 7) + 1;

        return weekNumber >= 1 && weekNumber <= 40 ? weekNumber : null;
    }

    getWeekStartDate(weekNumber) {
        if (!this.week1StartDate) return null;

        const startDate = new Date(this.week1StartDate);
        const daysToAdd = (weekNumber - 1) * 7;
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + daysToAdd);

        return weekStart;
    }

    formatDate(date) {
        if (!date) return '';
        const options = { day: 'numeric', month: 'short' };
        return date.toLocaleDateString('en-GB', options);
    }

    updateCurrentWeekDisplay() {
        const currentWeek = this.getCurrentWeek();
        const display = document.getElementById('current-week-display');

        if (currentWeek) {
            const weekStart = this.getWeekStartDate(currentWeek);
            display.textContent = `Week ${currentWeek} (w/b ${this.formatDate(weekStart)})`;
            display.style.color = 'var(--primary-color)';
        } else if (this.week1StartDate) {
            display.textContent = 'Outside planning period';
            display.style.color = 'var(--gray-500)';
        } else {
            display.textContent = 'Not Set';
            display.style.color = 'var(--gray-500)';
        }
    }

    // Navigation
    switchView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active');
        this.currentView = viewName;

        // Render the appropriate view
        switch(viewName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'tutors':
                this.renderTutors();
                break;
            case 'locations':
                this.renderLocations();
                break;
            case 'courses':
                this.renderCalendar();
                break;
            case 'reports':
                // Reports are generated on demand
                break;
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('btn-dashboard').addEventListener('click', () => this.switchView('dashboard'));
        document.getElementById('btn-tutors').addEventListener('click', () => this.switchView('tutors'));
        document.getElementById('btn-locations').addEventListener('click', () => this.switchView('locations'));
        document.getElementById('btn-courses').addEventListener('click', () => this.switchView('courses'));
        document.getElementById('btn-reports').addEventListener('click', () => this.switchView('reports'));
        document.getElementById('btn-export').addEventListener('click', () => this.openModal('modal-export'));

        // Tutors
        document.getElementById('btn-add-tutor').addEventListener('click', () => this.openTutorModal());
        document.getElementById('form-tutor').addEventListener('submit', (e) => this.saveTutor(e));
        document.getElementById('btn-add-custom-availability').addEventListener('click', () => this.addCustomAvailability('tutor'));

        // Locations
        document.getElementById('btn-add-location').addEventListener('click', () => this.openLocationModal());
        document.getElementById('form-location').addEventListener('submit', (e) => this.saveLocation(e));
        document.getElementById('btn-add-custom-location-availability').addEventListener('click', () => this.addCustomAvailability('location'));

        // Courses
        document.getElementById('btn-add-course').addEventListener('click', () => this.openCourseModal());
        document.getElementById('form-course').addEventListener('submit', (e) => this.saveCourse(e));
        document.getElementById('btn-delete-course').addEventListener('click', () => {
            const courseId = document.getElementById('course-id').value;
            if (courseId) this.deleteCourse(courseId);
        });
        document.getElementById('btn-prev-weeks').addEventListener('click', () => this.changeWeekOffset(-4));
        document.getElementById('btn-next-weeks').addEventListener('click', () => this.changeWeekOffset(4));
        document.getElementById('view-mode-select').addEventListener('change', (e) => {
            this.calendarViewMode = e.target.value;
            this.renderCalendar();
        });

        // Course form availability checking
        const courseFormInputs = ['course-tutor', 'course-location', 'course-day', 'course-start-time', 'course-end-time', 'course-start-week', 'course-duration'];
        courseFormInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => this.checkCourseFormAvailability());
            }
        });

        // Course color preview
        document.getElementById('course-color').addEventListener('input', (e) => {
            this.updateColorPreview(e.target.value);
        });

        // Settings
        document.getElementById('week1-start-date').addEventListener('change', (e) => {
            this.week1StartDate = e.target.value;
            this.saveData();
            this.updateCurrentWeekDisplay();
            this.renderDashboard();
        });

        // Reports
        document.getElementById('btn-generate-report').addEventListener('click', () => this.generateReport());

        // Export/Import
        document.getElementById('btn-export-pdf').addEventListener('click', () => this.exportToPDF());
        document.getElementById('btn-export-excel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('btn-export-json').addEventListener('click', () => this.exportToJSON());
        document.getElementById('btn-import-json').addEventListener('click', () => this.importFromJSON());

        // Modal close buttons
        document.querySelectorAll('.btn-close, .btn[data-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = btn.getAttribute('data-modal');
                if (modalId) this.closeModal(modalId);
            });
        });

        // Close modal on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // Modal Management
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    // Dashboard Rendering
    renderDashboard() {
        // Update stats
        document.getElementById('stat-courses').textContent = this.courses.length;
        document.getElementById('stat-tutors').textContent = this.tutors.length;
        document.getElementById('stat-locations').textContent = this.locations.length;

        const conflicts = this.detectAllConflicts();
        document.getElementById('stat-conflicts').textContent = conflicts.length;

        // Render upcoming courses
        this.renderUpcomingCourses();

        // Render utilization chart
        this.renderUtilizationChart();

        // Render conflicts
        this.renderConflictsList(conflicts);
    }

    renderUpcomingCourses() {
        const container = document.getElementById('upcoming-list');
        const currentWeek = this.getCurrentWeek();

        if (!currentWeek) {
            container.innerHTML = '<p style="color: var(--gray-500); text-align: center; font-size: 0.85rem;">Set Week 1 start date to see upcoming courses</p>';
            return;
        }

        const upcomingCourses = this.courses
            .filter(course => {
                const courseEndWeek = course.startWeek + course.duration - 1;
                return course.startWeek <= currentWeek + 1 && courseEndWeek >= currentWeek;
            })
            .sort((a, b) => {
                // Sort by week, then by day
                if (a.startWeek !== b.startWeek) return a.startWeek - b.startWeek;
                return a.dayOfWeek - b.dayOfWeek;
            })
            .slice(0, 10);

        if (upcomingCourses.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500); text-align: center; font-size: 0.85rem;">No upcoming courses this week</p>';
            return;
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        container.innerHTML = upcomingCourses.map(course => {
            const tutor = this.tutors.find(t => t.id === course.tutorId);
            const location = this.locations.find(l => l.id === course.locationId);
            const weekStart = this.getWeekStartDate(course.startWeek);
            const weekEndNum = course.startWeek + course.duration - 1;

            return `
                <div class="upcoming-item-compact" style="border-left-color: ${course.color}" onclick="planner.openCourseModal('${course.id}')">
                    <div class="upcoming-header">
                        <strong style="color: ${course.color}">${course.name}</strong>
                        <span class="upcoming-time">${days[course.dayOfWeek]} ${course.startTime}</span>
                    </div>
                    <div class="upcoming-details">
                        <span>${tutor ? tutor.name : 'No tutor'} • ${location ? location.name : 'No location'}</span>
                    </div>
                    <div class="upcoming-week">
                        Wk ${course.startWeek}${course.duration > 1 ? '-' + weekEndNum : ''} (w/b ${this.formatDate(weekStart)})
                    </div>
                </div>
            `;
        }).join('');
    }

    renderUtilizationChart() {
        const container = document.getElementById('utilization-chart');

        // Calculate tutor utilization
        const tutorUtil = this.calculateTutorUtilization();
        const locationUtil = this.calculateLocationUtilization();

        container.innerHTML = `
            <div class="utilization-bar">
                <span class="utilization-label">Tutors</span>
                <div class="utilization-progress">
                    <div class="utilization-fill" style="width: ${tutorUtil}%">
                        ${tutorUtil.toFixed(0)}%
                    </div>
                </div>
            </div>
            <div class="utilization-bar">
                <span class="utilization-label">Locations</span>
                <div class="utilization-progress">
                    <div class="utilization-fill" style="width: ${locationUtil}%">
                        ${locationUtil.toFixed(0)}%
                    </div>
                </div>
            </div>
        `;
    }

    calculateTutorUtilization() {
        if (this.tutors.length === 0) return 0;
        const tutorsWithCourses = new Set(this.courses.map(c => c.tutorId)).size;
        return (tutorsWithCourses / this.tutors.length) * 100;
    }

    calculateLocationUtilization() {
        if (this.locations.length === 0) return 0;
        const locationsWithCourses = new Set(this.courses.map(c => c.locationId)).size;
        return (locationsWithCourses / this.locations.length) * 100;
    }

    renderConflictsList(conflicts) {
        const container = document.getElementById('conflicts-list');

        if (conflicts.length === 0) {
            container.innerHTML = '<p style="color: var(--success-color); text-align: center;">No conflicts detected</p>';
            return;
        }

        container.innerHTML = conflicts.slice(0, 5).map(conflict => `
            <div class="conflict-item ${conflict.type === 'error' ? 'error' : ''}">
                <strong>${conflict.type === 'error' ? 'Error' : 'Warning'}:</strong> ${conflict.message}
            </div>
        `).join('');
    }

    // Tutor Management
    openTutorModal(tutorId = null) {
        this.editingId = tutorId;
        const form = document.getElementById('form-tutor');
        form.reset();

        // Render recurring availability grid
        this.renderRecurringAvailability('tutor');

        if (tutorId) {
            const tutor = this.tutors.find(t => t.id === tutorId);
            if (tutor) {
                document.getElementById('tutor-modal-title').textContent = 'Edit Tutor';
                document.getElementById('tutor-id').value = tutor.id;
                document.getElementById('tutor-name').value = tutor.name;
                document.getElementById('tutor-email').value = tutor.email || '';
                document.getElementById('tutor-phone').value = tutor.phone || '';
                document.getElementById('tutor-skills').value = tutor.skills || '';

                // Load recurring availability
                if (tutor.recurringAvailability) {
                    Object.keys(tutor.recurringAvailability).forEach(day => {
                        const slots = tutor.recurringAvailability[day];
                        slots.forEach(slot => {
                            const checkbox = document.querySelector(`input[data-day="${day}"][data-period="${slot}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    });
                }

                // Load custom availability
                this.renderCustomAvailability('tutor', tutor.customAvailability || []);
            }
        } else {
            document.getElementById('tutor-modal-title').textContent = 'Add Tutor';
            this.renderCustomAvailability('tutor', []);
        }

        this.openModal('modal-tutor');
    }

    renderRecurringAvailability(type) {
        // Use same day indexing as course form: Sunday=0, Monday=1, etc.
        const days = [
            { name: 'Mon', value: 1 },
            { name: 'Tue', value: 2 },
            { name: 'Wed', value: 3 },
            { name: 'Thu', value: 4 },
            { name: 'Fri', value: 5 },
            { name: 'Sat', value: 6 },
            { name: 'Sun', value: 0 }
        ];
        const periods = ['Morning', 'Afternoon', 'Evening'];
        const containerId = type === 'tutor' ? 'tutor-recurring-availability' : 'location-recurring-availability';
        const container = document.getElementById(containerId);

        container.innerHTML = days.map(day => `
            <div class="availability-day">
                <label>${day.name}</label>
                <div class="availability-slots">
                    ${periods.map(period => `
                        <div class="availability-slot">
                            <input type="checkbox" data-day="${day.value}" data-period="${period.toLowerCase()}">
                            <span>${period[0]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    addCustomAvailability(type) {
        const container = type === 'tutor'
            ? document.getElementById('tutor-custom-availability')
            : document.getElementById('location-custom-availability');

        const customItem = document.createElement('div');
        customItem.className = 'custom-availability-item';
        customItem.innerHTML = `
            <div class="details">
                <input type="date" class="input" style="display:inline-block; width: auto; margin-right: 0.5rem;" required>
                <input type="time" class="input" style="display:inline-block; width: auto; margin-right: 0.5rem;" required>
                to
                <input type="time" class="input" style="display:inline-block; width: auto; margin-left: 0.5rem;" required>
            </div>
            <button type="button" class="remove-btn">Remove</button>
        `;

        customItem.querySelector('.remove-btn').addEventListener('click', () => {
            customItem.remove();
        });

        container.appendChild(customItem);
    }

    renderCustomAvailability(type, customAvailability) {
        const containerId = type === 'tutor' ? 'tutor-custom-availability' : 'location-custom-availability';
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        customAvailability.forEach(avail => {
            const customItem = document.createElement('div');
            customItem.className = 'custom-availability-item';
            customItem.innerHTML = `
                <div class="details">
                    <input type="date" class="input" value="${avail.date}" style="display:inline-block; width: auto; margin-right: 0.5rem;" required>
                    <input type="time" class="input" value="${avail.startTime}" style="display:inline-block; width: auto; margin-right: 0.5rem;" required>
                    to
                    <input type="time" class="input" value="${avail.endTime}" style="display:inline-block; width: auto; margin-left: 0.5rem;" required>
                </div>
                <button type="button" class="remove-btn">Remove</button>
            `;

            customItem.querySelector('.remove-btn').addEventListener('click', () => {
                customItem.remove();
            });

            container.appendChild(customItem);
        });
    }

    saveTutor(e) {
        e.preventDefault();

        const tutorId = document.getElementById('tutor-id').value || this.generateId();
        const name = document.getElementById('tutor-name').value;
        const email = document.getElementById('tutor-email').value;
        const phone = document.getElementById('tutor-phone').value;
        const skills = document.getElementById('tutor-skills').value;

        // Get recurring availability
        const recurringAvailability = {};
        document.querySelectorAll('#tutor-recurring-availability input[type="checkbox"]:checked').forEach(checkbox => {
            const day = checkbox.getAttribute('data-day');
            const period = checkbox.getAttribute('data-period');
            if (!recurringAvailability[day]) recurringAvailability[day] = [];
            recurringAvailability[day].push(period);
        });

        // Get custom availability
        const customAvailability = [];
        document.querySelectorAll('#tutor-custom-availability .custom-availability-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            customAvailability.push({
                date: inputs[0].value,
                startTime: inputs[1].value,
                endTime: inputs[2].value
            });
        });

        const tutor = {
            id: tutorId,
            name,
            email,
            phone,
            skills,
            recurringAvailability,
            customAvailability
        };

        const existingIndex = this.tutors.findIndex(t => t.id === tutorId);
        if (existingIndex >= 0) {
            this.tutors[existingIndex] = tutor;
        } else {
            this.tutors.push(tutor);
        }

        this.saveData();
        this.closeModal('modal-tutor');
        this.renderTutors();
        if (this.currentView === 'dashboard') this.renderDashboard();
    }

    renderTutors() {
        const container = document.getElementById('tutors-grid');

        if (this.tutors.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500);">No tutors added yet. Click "Add Tutor" to get started.</p>';
            return;
        }

        container.innerHTML = this.tutors.map(tutor => `
            <div class="tutor-card">
                <div class="card-header">
                    <h3 class="card-title">${tutor.name}</h3>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-secondary" onclick="planner.openTutorModal('${tutor.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="planner.deleteTutor('${tutor.id}')">Delete</button>
                    </div>
                </div>
                <div class="card-content">
                    ${tutor.email ? `<p><strong>Email:</strong> ${tutor.email}</p>` : ''}
                    ${tutor.phone ? `<p><strong>Phone:</strong> ${tutor.phone}</p>` : ''}
                    ${tutor.skills ? `<p><strong>Skills:</strong> ${tutor.skills}</p>` : ''}
                    <div class="availability-summary">
                        <h4>Recurring Availability</h4>
                        <div class="availability-badges">
                            ${this.getAvailabilityBadges(tutor.recurringAvailability)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getAvailabilityBadges(recurringAvailability) {
        if (!recurringAvailability || Object.keys(recurringAvailability).length === 0) {
            return '<span class="badge">No recurring availability</span>';
        }

        // Map day index to day name (using new system: 0=Sun, 1=Mon, 2=Tue, etc.)
        const dayNames = {
            0: 'Sun',
            1: 'Mon',
            2: 'Tue',
            3: 'Wed',
            4: 'Thu',
            5: 'Fri',
            6: 'Sat'
        };

        return Object.keys(recurringAvailability)
            .sort((a, b) => {
                // Sort to show Mon-Sun order (1,2,3,4,5,6,0)
                const aNum = parseInt(a);
                const bNum = parseInt(b);
                const aOrder = aNum === 0 ? 7 : aNum;
                const bOrder = bNum === 0 ? 7 : bNum;
                return aOrder - bOrder;
            })
            .map(dayIndex => {
                const dayName = dayNames[dayIndex] || `Day ${dayIndex}`;
                const periods = recurringAvailability[dayIndex].join(', ');
                return `<span class="badge available">${dayName}: ${periods}</span>`;
            }).join('');
    }

    deleteTutor(tutorId) {
        if (confirm('Are you sure you want to delete this tutor? Courses assigned to this tutor will remain but show as unassigned.')) {
            this.tutors = this.tutors.filter(t => t.id !== tutorId);
            this.saveData();
            this.renderTutors();
            if (this.currentView === 'dashboard') this.renderDashboard();
        }
    }

    // Location Management
    openLocationModal(locationId = null) {
        this.editingId = locationId;
        const form = document.getElementById('form-location');
        form.reset();

        this.renderRecurringAvailability('location');

        if (locationId) {
            const location = this.locations.find(l => l.id === locationId);
            if (location) {
                document.getElementById('location-modal-title').textContent = 'Edit Location';
                document.getElementById('location-id').value = location.id;
                document.getElementById('location-name').value = location.name;
                document.getElementById('location-capacity').value = location.capacity || '';
                document.getElementById('location-facilities').value = location.facilities || '';

                if (location.recurringAvailability) {
                    Object.keys(location.recurringAvailability).forEach(day => {
                        const slots = location.recurringAvailability[day];
                        slots.forEach(slot => {
                            const checkbox = document.querySelector(`#location-recurring-availability input[data-day="${day}"][data-period="${slot}"]`);
                            if (checkbox) checkbox.checked = true;
                        });
                    });
                }

                this.renderCustomAvailability('location', location.customAvailability || []);
            }
        } else {
            document.getElementById('location-modal-title').textContent = 'Add Location';
            this.renderCustomAvailability('location', []);
        }

        this.openModal('modal-location');
    }

    saveLocation(e) {
        e.preventDefault();

        const locationId = document.getElementById('location-id').value || this.generateId();
        const name = document.getElementById('location-name').value;
        const capacity = document.getElementById('location-capacity').value;
        const facilities = document.getElementById('location-facilities').value;

        const recurringAvailability = {};
        document.querySelectorAll('#location-recurring-availability input[type="checkbox"]:checked').forEach(checkbox => {
            const day = checkbox.getAttribute('data-day');
            const period = checkbox.getAttribute('data-period');
            if (!recurringAvailability[day]) recurringAvailability[day] = [];
            recurringAvailability[day].push(period);
        });

        const customAvailability = [];
        document.querySelectorAll('#location-custom-availability .custom-availability-item').forEach(item => {
            const inputs = item.querySelectorAll('input');
            customAvailability.push({
                date: inputs[0].value,
                startTime: inputs[1].value,
                endTime: inputs[2].value
            });
        });

        const location = {
            id: locationId,
            name,
            capacity: capacity ? parseInt(capacity) : null,
            facilities,
            recurringAvailability,
            customAvailability
        };

        const existingIndex = this.locations.findIndex(l => l.id === locationId);
        if (existingIndex >= 0) {
            this.locations[existingIndex] = location;
        } else {
            this.locations.push(location);
        }

        this.saveData();
        this.closeModal('modal-location');
        this.renderLocations();
        if (this.currentView === 'dashboard') this.renderDashboard();
    }

    renderLocations() {
        const container = document.getElementById('locations-grid');

        if (this.locations.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500);">No locations added yet. Click "Add Location" to get started.</p>';
            return;
        }

        container.innerHTML = this.locations.map(location => `
            <div class="location-card">
                <div class="card-header">
                    <h3 class="card-title">${location.name}</h3>
                    <div class="card-actions">
                        <button class="btn btn-sm btn-secondary" onclick="planner.openLocationModal('${location.id}')">Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="planner.deleteLocation('${location.id}')">Delete</button>
                    </div>
                </div>
                <div class="card-content">
                    ${location.capacity ? `<p><strong>Capacity:</strong> ${location.capacity}</p>` : ''}
                    ${location.facilities ? `<p><strong>Facilities:</strong> ${location.facilities}</p>` : ''}
                    <div class="availability-summary">
                        <h4>Recurring Availability</h4>
                        <div class="availability-badges">
                            ${this.getAvailabilityBadges(location.recurringAvailability)}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    deleteLocation(locationId) {
        if (confirm('Are you sure you want to delete this location?')) {
            this.locations = this.locations.filter(l => l.id !== locationId);
            this.saveData();
            this.renderLocations();
            if (this.currentView === 'dashboard') this.renderDashboard();
        }
    }

    // Course Management
    openCourseModal(courseId = null) {
        this.editingId = courseId;
        const form = document.getElementById('form-course');
        form.reset();

        // Hide warnings initially
        document.getElementById('tutor-availability-warning').style.display = 'none';
        document.getElementById('location-availability-warning').style.display = 'none';
        document.getElementById('course-conflicts-warning').style.display = 'none';

        // Populate tutor dropdown
        const tutorSelect = document.getElementById('course-tutor');
        tutorSelect.innerHTML = '<option value="">Select Tutor</option>' +
            this.tutors.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        // Populate location dropdown
        const locationSelect = document.getElementById('course-location');
        locationSelect.innerHTML = '<option value="">Select Location</option>' +
            this.locations.map(l => `<option value="${l.id}">${l.name}</option>`).join('');

        if (courseId) {
            const course = this.courses.find(c => c.id === courseId);
            if (course) {
                document.getElementById('course-modal-title').textContent = 'Edit Course';
                document.getElementById('course-id').value = course.id;
                document.getElementById('course-name').value = course.name;
                document.getElementById('course-color').value = course.color;
                this.updateColorPreview(course.color);
                document.getElementById('course-tutor').value = course.tutorId;
                document.getElementById('course-location').value = course.locationId;
                document.getElementById('course-start-week').value = course.startWeek;
                document.getElementById('course-duration').value = course.duration;
                document.getElementById('course-day').value = course.dayOfWeek;
                document.getElementById('course-start-time').value = course.startTime;
                document.getElementById('course-end-time').value = course.endTime;
                document.getElementById('course-notes').value = course.notes || '';

                // Show delete button for existing courses
                document.getElementById('btn-delete-course').style.display = 'block';

                // Check availability with current values
                setTimeout(() => this.checkCourseFormAvailability(), 100);
            }
        } else {
            document.getElementById('course-modal-title').textContent = 'Add Course';
            const randomColor = this.getRandomColor();
            document.getElementById('course-color').value = randomColor;
            this.updateColorPreview(randomColor);

            // Hide delete button for new courses
            document.getElementById('btn-delete-course').style.display = 'none';
        }

        this.openModal('modal-course');
    }

    updateColorPreview(color) {
        const preview = document.getElementById('color-preview');
        preview.style.backgroundColor = color + '40'; // Add transparency
        preview.style.borderColor = color;
        preview.style.color = color;
        preview.textContent = color.toUpperCase();
    }

    checkCourseFormAvailability() {
        const courseId = document.getElementById('course-id').value;
        const tutorId = document.getElementById('course-tutor').value;
        const locationId = document.getElementById('course-location').value;
        const dayOfWeek = parseInt(document.getElementById('course-day').value);
        const startTime = document.getElementById('course-start-time').value;
        const endTime = document.getElementById('course-end-time').value;
        const startWeek = parseInt(document.getElementById('course-start-week').value);
        const duration = parseInt(document.getElementById('course-duration').value);

        const tutorWarning = document.getElementById('tutor-availability-warning');
        const locationWarning = document.getElementById('location-availability-warning');
        const conflictWarning = document.getElementById('course-conflicts-warning');

        // Check tutor availability
        if (tutorId && !isNaN(dayOfWeek) && startTime && endTime) {
            const available = this.checkTutorAvailability(tutorId, dayOfWeek, startTime, endTime);
            const tutorName = this.getTutorName(tutorId);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            if (available) {
                tutorWarning.className = 'availability-warning success';
                tutorWarning.textContent = `${tutorName} is available on ${days[dayOfWeek]} at this time`;
                tutorWarning.style.display = 'flex';
            } else {
                tutorWarning.className = 'availability-warning warning';
                tutorWarning.textContent = `${tutorName} is NOT marked as available on ${days[dayOfWeek]} during ${startTime}-${endTime}`;
                tutorWarning.style.display = 'flex';
            }
        } else {
            tutorWarning.style.display = 'none';
        }

        // Check location availability
        if (locationId && !isNaN(dayOfWeek) && startTime && endTime) {
            const available = this.checkLocationAvailability(locationId, dayOfWeek, startTime, endTime);
            const locationName = this.getLocationName(locationId);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            if (available) {
                locationWarning.className = 'availability-warning success';
                locationWarning.textContent = `${locationName} is available on ${days[dayOfWeek]} at this time`;
                locationWarning.style.display = 'flex';
            } else {
                locationWarning.className = 'availability-warning warning';
                locationWarning.textContent = `${locationName} is NOT marked as available on ${days[dayOfWeek]} during ${startTime}-${endTime}`;
                locationWarning.style.display = 'flex';
            }
        } else {
            locationWarning.style.display = 'none';
        }

        // Check for conflicts
        if (tutorId && locationId && !isNaN(dayOfWeek) && startTime && endTime && !isNaN(startWeek) && !isNaN(duration)) {
            const tempCourse = {
                id: courseId || 'temp',
                tutorId,
                locationId,
                dayOfWeek,
                startTime,
                endTime,
                startWeek,
                duration
            };

            const conflicts = this.checkCourseConflicts(tempCourse);

            if (conflicts.length > 0) {
                conflictWarning.className = 'availability-warning error';
                conflictWarning.innerHTML = `<strong>Conflicts detected:</strong><br>${conflicts.join('<br>')}`;
                conflictWarning.style.display = 'flex';
            } else {
                conflictWarning.style.display = 'none';
            }
        } else {
            conflictWarning.style.display = 'none';
        }
    }

    saveCourse(e) {
        e.preventDefault();

        const courseId = document.getElementById('course-id').value || this.generateId();
        const name = document.getElementById('course-name').value;
        const color = document.getElementById('course-color').value;
        const tutorId = document.getElementById('course-tutor').value;
        const locationId = document.getElementById('course-location').value;
        const startWeek = parseInt(document.getElementById('course-start-week').value);
        const duration = parseInt(document.getElementById('course-duration').value);
        const dayOfWeek = parseInt(document.getElementById('course-day').value);
        const startTime = document.getElementById('course-start-time').value;
        const endTime = document.getElementById('course-end-time').value;
        const notes = document.getElementById('course-notes').value;

        const course = {
            id: courseId,
            name,
            color,
            tutorId,
            locationId,
            startWeek,
            duration,
            dayOfWeek,
            startTime,
            endTime,
            notes
        };

        // Check tutor availability
        const tutorAvailable = this.checkTutorAvailability(tutorId, dayOfWeek, startTime, endTime);
        if (!tutorAvailable) {
            const tutorName = this.getTutorName(tutorId);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            if (!confirm(`Warning: ${tutorName} is not marked as available on ${days[dayOfWeek]} during ${startTime}-${endTime}.\n\nDo you want to schedule this course anyway?`)) {
                return;
            }
        }

        // Check location availability
        const locationAvailable = this.checkLocationAvailability(locationId, dayOfWeek, startTime, endTime);
        if (!locationAvailable) {
            const locationName = this.getLocationName(locationId);
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            if (!confirm(`Warning: ${locationName} is not marked as available on ${days[dayOfWeek]} during ${startTime}-${endTime}.\n\nDo you want to schedule this course anyway?`)) {
                return;
            }
        }

        // Check for double-booking conflicts
        const conflicts = this.checkCourseConflicts(course);
        if (conflicts.length > 0) {
            const conflictMessages = conflicts.map(c => `- ${c}`).join('\n');
            if (!confirm(`WARNING: This course creates the following conflicts:\n\n${conflictMessages}\n\nDo you want to schedule this course anyway?`)) {
                return;
            }
        }

        const existingIndex = this.courses.findIndex(c => c.id === courseId);
        if (existingIndex >= 0) {
            this.courses[existingIndex] = course;
        } else {
            this.courses.push(course);
        }

        this.saveData();
        this.closeModal('modal-course');

        // Always re-render calendar to update colors
        if (this.currentView === 'courses') {
            this.renderCalendar();
        }
        if (this.currentView === 'dashboard') {
            this.renderDashboard();
        }
    }

    deleteCourse(courseId) {
        if (confirm('Are you sure you want to delete this course?')) {
            this.courses = this.courses.filter(c => c.id !== courseId);
            this.saveData();
            this.closeModal('modal-course');
            this.renderCalendar();
            if (this.currentView === 'dashboard') this.renderDashboard();
        }
    }

    // Calendar Rendering
    changeWeekOffset(change) {
        this.calendarWeekOffset += change;
        if (this.calendarWeekOffset < 0) this.calendarWeekOffset = 0;
        if (this.calendarWeekOffset > 16) this.calendarWeekOffset = 16;
        this.renderCalendar();
    }

    renderCalendar() {
        const container = document.getElementById('calendar-grid');
        const weeksToShow = this.calendarViewMode === 'week' ? 1 : 4;
        const startWeek = this.calendarWeekOffset + 1;
        const endWeek = startWeek + weeksToShow - 1;

        document.getElementById('week-range-display').textContent =
            weeksToShow === 1 ? `Week ${startWeek}` : `Weeks ${startWeek}-${endWeek}`;

        const days = ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const timeSlots = this.generateTimeSlots();

        // Header row with weeks
        let html = '<div class="calendar-header">Time</div>';
        for (let week = startWeek; week <= endWeek; week++) {
            const weekStart = this.getWeekStartDate(week);
            const weekStartFormatted = weekStart ? ` (w/b ${this.formatDate(weekStart)})` : '';
            html += `<div class="calendar-header calendar-week-header" style="grid-column: span 7;">Week ${week}${weekStartFormatted}</div>`;
        }

        // Day headers for each week
        html += '<div class="calendar-header"></div>'; // Empty cell for time column
        for (let week = startWeek; week <= endWeek; week++) {
            for (let i = 1; i < days.length; i++) {
                html += `<div class="calendar-header calendar-day-header">${days[i]}</div>`;
            }
        }

        // Time slots and cells
        timeSlots.forEach(time => {
            html += `<div class="calendar-time-label">${time}</div>`;

            for (let week = startWeek; week <= endWeek; week++) {
                for (let day = 1; day <= 7; day++) {
                    const dayOfWeek = day === 7 ? 0 : day;
                    const coursesAtSlot = this.getCoursesAtTimeSlot(week, week, dayOfWeek, time);

                    html += `<div class="calendar-cell ${coursesAtSlot.length > 0 ? 'has-course' : ''}"
                             data-week="${week}" data-day="${dayOfWeek}" data-time="${time}">`;

                    coursesAtSlot.forEach(course => {
                        const tutor = this.tutors.find(t => t.id === course.tutorId);
                        const location = this.locations.find(l => l.id === course.locationId);

                        // Check if this specific course has a conflict
                        const courseHasConflict = this.checkCourseConflicts(course).length > 0;

                        html += `
                            <div class="course-block ${courseHasConflict ? 'conflict' : ''}"
                                 style="background-color: ${course.color}20; border-left-color: ${course.color}"
                                 onclick="planner.openCourseModal('${course.id}')">
                                ${courseHasConflict ? '<span class="conflict-indicator">!</span>' : ''}
                                <span class="course-name">${course.name}</span>
                                <div class="course-details">
                                    ${tutor ? tutor.name : 'No tutor'} | ${location ? location.name : 'No location'}
                                </div>
                            </div>
                        `;
                    });

                    html += '</div>';
                }
            }
        });

        container.innerHTML = html;

        // Update grid columns dynamically
        const totalColumns = 1 + (weeksToShow * 7); // 1 for time + 7 days per week
        container.style.gridTemplateColumns = `80px repeat(${weeksToShow * 7}, 1fr)`;
    }

    generateTimeSlots() {
        const slots = [];
        for (let hour = 9; hour <= 17; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return slots;
    }

    getCoursesAtTimeSlot(startWeek, endWeek, dayOfWeek, timeSlot) {
        const [slotHour] = timeSlot.split(':').map(Number);

        return this.courses.filter(course => {
            // Check if course runs during these weeks
            const courseEndWeek = course.startWeek + course.duration - 1;
            const inWeekRange = !(courseEndWeek < startWeek || course.startWeek > endWeek);

            if (!inWeekRange || course.dayOfWeek !== dayOfWeek) return false;

            // Check if course runs during this time slot
            const [courseStartHour] = course.startTime.split(':').map(Number);
            const [courseEndHour] = course.endTime.split(':').map(Number);

            return slotHour >= courseStartHour && slotHour < courseEndHour;
        });
    }

    // Conflict Detection
    detectAllConflicts() {
        const conflicts = [];

        // Check for tutor conflicts
        this.courses.forEach((course, index) => {
            this.courses.slice(index + 1).forEach(otherCourse => {
                if (this.coursesOverlap(course, otherCourse)) {
                    if (course.tutorId === otherCourse.tutorId) {
                        conflicts.push({
                            type: 'error',
                            message: `Tutor ${this.getTutorName(course.tutorId)} is double-booked: "${course.name}" and "${otherCourse.name}"`
                        });
                    }

                    if (course.locationId === otherCourse.locationId) {
                        conflicts.push({
                            type: 'error',
                            message: `Location ${this.getLocationName(course.locationId)} is double-booked: "${course.name}" and "${otherCourse.name}"`
                        });
                    }
                }
            });
        });

        return conflicts;
    }

    coursesOverlap(course1, course2) {
        // Check if they're on the same day
        if (course1.dayOfWeek !== course2.dayOfWeek) return false;

        // Check if their week ranges overlap
        const c1EndWeek = course1.startWeek + course1.duration - 1;
        const c2EndWeek = course2.startWeek + course2.duration - 1;

        if (c1EndWeek < course2.startWeek || c2EndWeek < course1.startWeek) return false;

        // Check if their time slots overlap
        const c1Start = this.timeToMinutes(course1.startTime);
        const c1End = this.timeToMinutes(course1.endTime);
        const c2Start = this.timeToMinutes(course2.startTime);
        const c2End = this.timeToMinutes(course2.endTime);

        return !(c1End <= c2Start || c2End <= c1Start);
    }

    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getTutorName(tutorId) {
        const tutor = this.tutors.find(t => t.id === tutorId);
        return tutor ? tutor.name : 'Unknown';
    }

    getLocationName(locationId) {
        const location = this.locations.find(l => l.id === locationId);
        return location ? location.name : 'Unknown';
    }

    checkCourseConflicts(newCourse) {
        const conflicts = [];

        // Check against all existing courses (excluding the one being edited)
        this.courses.forEach(existingCourse => {
            // Skip if it's the same course (editing scenario)
            if (existingCourse.id === newCourse.id) return;

            // Check if courses overlap
            if (this.coursesOverlap(newCourse, existingCourse)) {
                // Check for tutor conflict
                if (newCourse.tutorId === existingCourse.tutorId) {
                    const tutorName = this.getTutorName(newCourse.tutorId);
                    conflicts.push(`Tutor "${tutorName}" is already teaching "${existingCourse.name}" at this time`);
                }

                // Check for location conflict
                if (newCourse.locationId === existingCourse.locationId) {
                    const locationName = this.getLocationName(newCourse.locationId);
                    conflicts.push(`Location "${locationName}" is already being used for "${existingCourse.name}" at this time`);
                }
            }
        });

        return conflicts;
    }

    // Availability Checking
    checkTutorAvailability(tutorId, dayOfWeek, startTime, endTime) {
        const tutor = this.tutors.find(t => t.id === tutorId);
        if (!tutor) return false;

        // If no availability is set, return true (assume available)
        if (!tutor.recurringAvailability || Object.keys(tutor.recurringAvailability).length === 0) {
            return true;
        }

        // Check recurring availability
        const dayAvailability = tutor.recurringAvailability[dayOfWeek];
        if (!dayAvailability || dayAvailability.length === 0) {
            return false; // Not available on this day
        }

        // Determine which period(s) the course falls into
        const courseStartMinutes = this.timeToMinutes(startTime);
        const courseEndMinutes = this.timeToMinutes(endTime);

        // Define period time ranges (in minutes from midnight)
        const periods = {
            morning: { start: 6 * 60, end: 12 * 60 },      // 6am - 12pm
            afternoon: { start: 12 * 60, end: 17 * 60 },   // 12pm - 5pm
            evening: { start: 17 * 60, end: 22 * 60 }      // 5pm - 10pm
        };

        // Check if the ENTIRE course time falls within any available period
        for (const period of dayAvailability) {
            const periodRange = periods[period];
            if (periodRange) {
                // Course must be completely contained within the available period
                if (courseStartMinutes >= periodRange.start && courseEndMinutes <= periodRange.end) {
                    return true; // Course is fully within this available period
                }
            }
        }

        // Also check if course spans multiple consecutive periods that are all available
        const allPeriods = ['morning', 'afternoon', 'evening'];
        for (let i = 0; i < allPeriods.length; i++) {
            if (dayAvailability.includes(allPeriods[i])) {
                let combinedStart = periods[allPeriods[i]].start;
                let combinedEnd = periods[allPeriods[i]].end;

                // Extend the range if consecutive periods are also available
                for (let j = i + 1; j < allPeriods.length; j++) {
                    if (dayAvailability.includes(allPeriods[j])) {
                        combinedEnd = periods[allPeriods[j]].end;
                    } else {
                        break;
                    }
                }

                // Check if course fits in this combined range
                if (courseStartMinutes >= combinedStart && courseEndMinutes <= combinedEnd) {
                    return true;
                }
            }
        }

        return false;
    }

    checkLocationAvailability(locationId, dayOfWeek, startTime, endTime) {
        const location = this.locations.find(l => l.id === locationId);
        if (!location) return false;

        // If no availability is set, return true (assume available)
        if (!location.recurringAvailability || Object.keys(location.recurringAvailability).length === 0) {
            return true;
        }

        // Check recurring availability
        const dayAvailability = location.recurringAvailability[dayOfWeek];
        if (!dayAvailability || dayAvailability.length === 0) {
            return false; // Not available on this day
        }

        // Determine which period(s) the course falls into
        const courseStartMinutes = this.timeToMinutes(startTime);
        const courseEndMinutes = this.timeToMinutes(endTime);

        // Define period time ranges
        const periods = {
            morning: { start: 6 * 60, end: 12 * 60 },
            afternoon: { start: 12 * 60, end: 17 * 60 },
            evening: { start: 17 * 60, end: 22 * 60 }
        };

        // Check if the ENTIRE course time falls within any available period
        for (const period of dayAvailability) {
            const periodRange = periods[period];
            if (periodRange) {
                // Course must be completely contained within the available period
                if (courseStartMinutes >= periodRange.start && courseEndMinutes <= periodRange.end) {
                    return true; // Course is fully within this available period
                }
            }
        }

        // Also check if course spans multiple consecutive periods that are all available
        const allPeriods = ['morning', 'afternoon', 'evening'];
        for (let i = 0; i < allPeriods.length; i++) {
            if (dayAvailability.includes(allPeriods[i])) {
                let combinedStart = periods[allPeriods[i]].start;
                let combinedEnd = periods[allPeriods[i]].end;

                // Extend the range if consecutive periods are also available
                for (let j = i + 1; j < allPeriods.length; j++) {
                    if (dayAvailability.includes(allPeriods[j])) {
                        combinedEnd = periods[allPeriods[j]].end;
                    } else {
                        break;
                    }
                }

                // Check if course fits in this combined range
                if (courseStartMinutes >= combinedStart && courseEndMinutes <= combinedEnd) {
                    return true;
                }
            }
        }

        return false;
    }

    // Reports
    generateReport() {
        const reportType = document.getElementById('report-type-select').value;
        const container = document.getElementById('report-content');

        switch(reportType) {
            case 'tutor-schedule':
                this.generateTutorScheduleReport(container);
                break;
            case 'location-utilization':
                this.generateLocationUtilizationReport(container);
                break;
            case 'course-list':
                this.generateCourseListReport(container);
                break;
            case 'conflicts':
                this.generateConflictsReport(container);
                break;
        }
    }

    generateTutorScheduleReport(container) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let html = '<h3>Tutor Schedules</h3>';

        this.tutors.forEach(tutor => {
            const tutorCourses = this.courses.filter(c => c.tutorId === tutor.id);

            html += `
                <div style="margin-bottom: 2rem; padding: 1rem; background: var(--gray-100); border-radius: 8px;">
                    <h4>${tutor.name}</h4>
                    ${tutorCourses.length === 0 ? '<p>No courses assigned</p>' : `
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Day</th>
                                    <th>Time</th>
                                    <th>Weeks</th>
                                    <th>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tutorCourses.map(course => `
                                    <tr>
                                        <td>${course.name}</td>
                                        <td>${days[course.dayOfWeek]}</td>
                                        <td>${course.startTime} - ${course.endTime}</td>
                                        <td>${course.startWeek}-${course.startWeek + course.duration - 1}</td>
                                        <td>${this.getLocationName(course.locationId)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    generateLocationUtilizationReport(container) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let html = '<h3>Location Utilization</h3>';

        this.locations.forEach(location => {
            const locationCourses = this.courses.filter(c => c.locationId === location.id);

            html += `
                <div style="margin-bottom: 2rem; padding: 1rem; background: var(--gray-100); border-radius: 8px;">
                    <h4>${location.name}</h4>
                    ${locationCourses.length === 0 ? '<p>No courses scheduled</p>' : `
                        <table class="report-table">
                            <thead>
                                <tr>
                                    <th>Course</th>
                                    <th>Day</th>
                                    <th>Time</th>
                                    <th>Weeks</th>
                                    <th>Tutor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${locationCourses.map(course => `
                                    <tr>
                                        <td>${course.name}</td>
                                        <td>${days[course.dayOfWeek]}</td>
                                        <td>${course.startTime} - ${course.endTime}</td>
                                        <td>${course.startWeek}-${course.startWeek + course.duration - 1}</td>
                                        <td>${this.getTutorName(course.tutorId)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    generateCourseListReport(container) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const sortedCourses = [...this.courses].sort((a, b) => a.startWeek - b.startWeek);

        const html = `
            <h3>Course List</h3>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Course Name</th>
                        <th>Tutor</th>
                        <th>Location</th>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Start Week</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedCourses.map(course => `
                        <tr>
                            <td style="border-left: 4px solid ${course.color}">${course.name}</td>
                            <td>${this.getTutorName(course.tutorId)}</td>
                            <td>${this.getLocationName(course.locationId)}</td>
                            <td>${days[course.dayOfWeek]}</td>
                            <td>${course.startTime} - ${course.endTime}</td>
                            <td>${course.startWeek}</td>
                            <td>${course.duration} weeks</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    generateConflictsReport(container) {
        const conflicts = this.detectAllConflicts();

        const html = `
            <h3>Conflicts Report</h3>
            ${conflicts.length === 0 ?
                '<p style="color: var(--success-color); font-size: 1.2rem;">No conflicts detected!</p>' :
                `<div style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--warning-color);">
                    <p><strong>${conflicts.length} conflict(s) found:</strong></p>
                    <ul>
                        ${conflicts.map(c => `<li>${c.message}</li>`).join('')}
                    </ul>
                </div>`
            }
        `;

        container.innerHTML = html;
    }

    // Export Functions
    exportToPDF() {
        alert('PDF export requires a library like jsPDF. For now, you can print this page (Ctrl+P) and save as PDF.');
        window.print();
    }

    exportToExcel() {
        // Simple CSV export that can be opened in Excel
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let csv = 'Course Name,Tutor,Location,Day,Start Time,End Time,Start Week,Duration\n';

        this.courses.forEach(course => {
            csv += `"${course.name}",`;
            csv += `"${this.getTutorName(course.tutorId)}",`;
            csv += `"${this.getLocationName(course.locationId)}",`;
            csv += `"${days[course.dayOfWeek]}",`;
            csv += `"${course.startTime}",`;
            csv += `"${course.endTime}",`;
            csv += `"${course.startWeek}",`;
            csv += `"${course.duration}"\n`;
        });

        this.downloadFile('courses.csv', csv, 'text/csv');
    }

    exportToJSON() {
        const data = {
            tutors: this.tutors,
            locations: this.locations,
            courses: this.courses,
            exportDate: new Date().toISOString()
        };

        this.downloadFile('course-planner-data.json', JSON.stringify(data, null, 2), 'application/json');
    }

    importFromJSON() {
        const input = document.getElementById('input-import-json');
        const file = input.files[0];

        if (!file) {
            alert('Please select a file to import');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (confirm('This will replace all current data. Are you sure?')) {
                    this.tutors = data.tutors || [];
                    this.locations = data.locations || [];
                    this.courses = data.courses || [];
                    this.saveData();

                    alert('Data imported successfully!');
                    this.closeModal('modal-export');
                    this.switchView('dashboard');
                }
            } catch (error) {
                alert('Error importing file: ' + error.message);
            }
        };

        reader.readAsText(file);
    }

    downloadFile(filename, content, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Utility Functions
    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getRandomColor() {
        const colors = ['#4a90e2', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#3498db'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
}

// Initialize the application
const planner = new CoursePlanner();
