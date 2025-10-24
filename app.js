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
        this.settings = {
            fundedCourseColor: '#4CAF50',    // Green for funded
            nonFundedCourseColor: '#2196F3'  // Blue for non-funded
        };

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
            this.settings = data.settings || {
                fundedCourseColor: '#4CAF50',
                nonFundedCourseColor: '#2196F3'
            };

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

            // Initialize canTeach array if it doesn't exist
            if (!tutor.canTeach) {
                tutor.canTeach = [];
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

        // Migrate courses
        this.courses.forEach(course => {
            // Initialize qualifiedTutors array if it doesn't exist
            if (!course.qualifiedTutors) {
                course.qualifiedTutors = [];
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
            week1StartDate: this.week1StartDate,
            settings: this.settings
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
                this.populateCourseSelector();
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
        document.getElementById('btn-prev-weeks').addEventListener('click', () => {
            let increment;
            if (this.calendarViewMode === 'week') {
                increment = 1;
            } else if (this.calendarViewMode === 'month') {
                increment = 4;
            } else {
                increment = 4; // Default for '4weeks' mode
            }
            this.changeWeekOffset(-increment);
        });
        document.getElementById('btn-next-weeks').addEventListener('click', () => {
            let increment;
            if (this.calendarViewMode === 'week') {
                increment = 1;
            } else if (this.calendarViewMode === 'month') {
                increment = 4;
            } else {
                increment = 4; // Default for '4weeks' mode
            }
            this.changeWeekOffset(increment);
        });
        document.getElementById('view-mode-select').addEventListener('change', (e) => {
            this.calendarViewMode = e.target.value;
            this.renderCalendar();
        });

        // Course selector dropdown
        document.getElementById('course-selector').addEventListener('change', (e) => {
            const courseId = e.target.value;
            if (courseId) {
                this.openCourseModal(courseId);
                // Reset the selector
                e.target.value = '';
            }
        });

        // Course search
        document.getElementById('course-search').addEventListener('input', (e) => {
            this.filterCoursesBySearch(e.target.value);
        });

        // Navigation buttons
        document.getElementById('btn-today').addEventListener('click', () => this.jumpToToday());
        document.getElementById('btn-jump-to-week').addEventListener('click', () => this.jumpToWeekPrompt());

        // Duplicate course button
        document.getElementById('btn-duplicate-course').addEventListener('click', () => this.duplicateCourse());

        // Course form availability checking
        const courseFormInputs = ['course-tutor', 'course-location', 'course-day', 'course-start-time', 'course-end-time', 'course-start-week', 'course-duration', 'course-students'];
        courseFormInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('change', () => {
                    this.updateResourceDropdowns();
                    this.checkCourseFormAvailability();
                });
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

        // Color settings
        document.getElementById('funded-color').addEventListener('change', (e) => {
            this.settings.fundedCourseColor = e.target.value;
            this.updateColorPreviews();
            this.saveData();
            if (this.currentView === 'courses') this.renderCalendar();
        });

        document.getElementById('non-funded-color').addEventListener('change', (e) => {
            this.settings.nonFundedCourseColor = e.target.value;
            this.updateColorPreviews();
            this.saveData();
            if (this.currentView === 'courses') this.renderCalendar();
        });

        // Reports
        document.getElementById('btn-generate-report').addEventListener('click', () => this.generateReport());
        document.getElementById('report-type-select').addEventListener('change', () => this.generateReport());


        // Export/Import
        document.getElementById('btn-export-pdf').addEventListener('click', () => this.exportToPDF());
        document.getElementById('btn-export-excel').addEventListener('click', () => this.exportToExcel());
        document.getElementById('btn-export-json').addEventListener('click', () => this.exportToJSON());
        document.getElementById('btn-export-ai').addEventListener('click', () => this.exportForAI());
        document.getElementById('btn-paste-json').addEventListener('click', () => this.openPasteJsonModal());
        document.getElementById('btn-import-file').addEventListener('click', () => document.getElementById('input-import-json').click());
        document.getElementById('input-import-json').addEventListener('change', () => this.importFromJSON());
        document.getElementById('btn-process-paste').addEventListener('click', () => this.processPastedJSON());
        document.getElementById('btn-undo-import').addEventListener('click', () => this.restoreBackup());

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

        // If closing any resource modal while on reports view, refresh the report
        if (this.currentView === 'reports' &&
            (modalId === 'modal-course' || modalId === 'modal-tutor' || modalId === 'modal-location')) {
            this.generateReport();
        }
    }

    // Dashboard Rendering
    renderDashboard() {
        // Update stats
        document.getElementById('stat-courses').textContent = this.courses.length;
        document.getElementById('stat-tutors').textContent = this.tutors.length;
        document.getElementById('stat-locations').textContent = this.locations.length;

        const conflicts = this.detectAllConflicts();
        document.getElementById('stat-conflicts').textContent = conflicts.length;

        // Initialize color pickers
        document.getElementById('funded-color').value = this.settings.fundedCourseColor;
        document.getElementById('non-funded-color').value = this.settings.nonFundedCourseColor;
        this.updateColorPreviews();

        // Render upcoming courses
        this.renderUpcomingCourses();

        // Render utilization chart
        this.renderUtilizationChart();

        // Render conflicts
        this.renderConflictsList(conflicts);
    }

    updateColorPreviews() {
        const fundedPreview = document.getElementById('funded-color-preview');
        const nonFundedPreview = document.getElementById('non-funded-color-preview');

        if (fundedPreview) {
            fundedPreview.style.backgroundColor = this.settings.fundedCourseColor + '40';
            fundedPreview.style.borderLeft = `4px solid ${this.settings.fundedCourseColor}`;
            fundedPreview.textContent = 'Funded Course Preview';
        }

        if (nonFundedPreview) {
            nonFundedPreview.style.backgroundColor = this.settings.nonFundedCourseColor + '40';
            nonFundedPreview.style.borderLeft = `4px solid ${this.settings.nonFundedCourseColor}`;
            nonFundedPreview.textContent = 'Non-Funded Course Preview';
        }
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
                // Sort by week, then by day (use first day for multi-day courses)
                if (a.startWeek !== b.startWeek) return a.startWeek - b.startWeek;
                const aFirstDay = a.daysOfWeek ? a.daysOfWeek[0] : a.dayOfWeek;
                const bFirstDay = b.daysOfWeek ? b.daysOfWeek[0] : b.dayOfWeek;
                return aFirstDay - bFirstDay;
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

            // Check if resources are available on all days
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            let hasAvailabilityIssue = false;
            courseDays.forEach(day => {
                if (!this.checkTutorAvailability(course.tutorId, day, course.startTime, course.endTime) ||
                    !this.checkLocationAvailability(course.locationId, day, course.startTime, course.endTime)) {
                    hasAvailabilityIssue = true;
                }
            });

            // Format days display
            const daysList = courseDays.map(d => days[d]).join('/');

            return `
                <div class="upcoming-item-compact" style="border-left-color: ${course.color}; cursor: pointer;" onclick="planner.openCourseModal('${course.id}')">
                    <div class="upcoming-header">
                        <strong style="color: ${course.color}">
                            ${hasAvailabilityIssue ? '<span class="conflict-indicator">!</span> ' : ''}${course.name}
                        </strong>
                        <span class="upcoming-time">${daysList} ${course.startTime}</span>
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

        container.innerHTML = conflicts.slice(0, 5).map(conflict => {
            let displayMessage = conflict.message;

            // Make course names clickable if we have course references
            if (conflict.course1 && conflict.course2) {
                const course1Name = conflict.course1.name;
                const course2Name = conflict.course2.name;

                // Replace first course name
                const quote1Pattern = `"${course1Name}"`;
                if (displayMessage.includes(quote1Pattern)) {
                    const course1Link = `<span onclick="planner.openCourseModal('${conflict.course1.id}')" style="color: ${conflict.course1.color}; font-weight: 600; cursor: pointer; text-decoration: underline;">"${course1Name}"</span>`;
                    displayMessage = displayMessage.replace(quote1Pattern, course1Link);
                }

                // Replace second course name
                const quote2Pattern = `"${course2Name}"`;
                if (displayMessage.includes(quote2Pattern)) {
                    const course2Link = `<span onclick="planner.openCourseModal('${conflict.course2.id}')" style="color: ${conflict.course2.color}; font-weight: 600; cursor: pointer; text-decoration: underline;">"${course2Name}"</span>`;
                    displayMessage = displayMessage.replace(quote2Pattern, course2Link);
                }
            }

            return `
                <div class="conflict-item ${conflict.type === 'error' ? 'error' : ''}">
                    <strong>${conflict.type === 'error' ? 'Error' : 'Warning'}:</strong> ${displayMessage}
                </div>
            `;
        }).join('');
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

                // Populate course checkboxes
                this.populateTutorCanTeach(tutor.canTeach || []);
            }
        } else {
            document.getElementById('tutor-modal-title').textContent = 'Add Tutor';
            document.getElementById('tutor-id').value = ''; // Explicitly clear ID for new tutor
            this.renderCustomAvailability('tutor', []);
            this.populateTutorCanTeach([]);
        }

        this.openModal('modal-tutor');
    }

    populateTutorCanTeach(canTeachIds) {
        const container = document.getElementById('tutor-can-teach');

        if (this.courses.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500); font-size: 0.9em; margin: 0;">No courses created yet</p>';
            return;
        }

        container.innerHTML = this.courses.map(course => `
            <label style="display: flex; align-items: center; padding: 0.3rem; cursor: pointer;"
                   onmouseover="this.style.background='var(--gray-100)'"
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" name="tutor-course" value="${course.id}"
                       ${canTeachIds.includes(course.id) ? 'checked' : ''}
                       style="margin-right: 0.5rem;">
                <span>${course.name}</span>
            </label>
        `).join('');
    }

    populateCourseQualifiedTutors(qualifiedTutorIds) {
        const container = document.getElementById('course-qualified-tutors');

        if (this.tutors.length === 0) {
            container.innerHTML = '<p style="color: var(--gray-500); font-size: 0.9em; margin: 0;">No tutors created yet</p>';
            return;
        }

        container.innerHTML = this.tutors.map(tutor => `
            <label style="display: flex; align-items: center; padding: 0.3rem; cursor: pointer;"
                   onmouseover="this.style.background='var(--gray-100)'"
                   onmouseout="this.style.background='transparent'">
                <input type="checkbox" name="qualified-tutor" value="${tutor.id}"
                       ${qualifiedTutorIds.includes(tutor.id) ? 'checked' : ''}
                       style="margin-right: 0.5rem;"
                       onchange="planner.updateResourceDropdowns()">
                <span>${tutor.name}</span>
            </label>
        `).join('');
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

        // Get canTeach (selected courses)
        const canTeach = [];
        document.querySelectorAll('input[name="tutor-course"]:checked').forEach(checkbox => {
            canTeach.push(checkbox.value);
        });

        const tutor = {
            id: tutorId,
            name,
            email,
            phone,
            skills,
            recurringAvailability,
            customAvailability,
            canTeach
        };

        const existingIndex = this.tutors.findIndex(t => t.id === tutorId);
        if (existingIndex >= 0) {
            this.tutors[existingIndex] = tutor;
        } else {
            this.tutors.push(tutor);
        }

        // Sync: Update qualifiedTutors in courses based on this tutor's canTeach
        this.syncTutorToCourses(tutorId, canTeach);

        this.saveData();
        this.closeModal('modal-tutor');
        this.renderTutors();
        if (this.currentView === 'dashboard') this.renderDashboard();
    }

    syncTutorToCourses(tutorId, canTeachCourseIds) {
        // For each course, add or remove this tutor from qualifiedTutors
        this.courses.forEach(course => {
            if (!course.qualifiedTutors) course.qualifiedTutors = [];

            const isQualified = canTeachCourseIds.includes(course.id);
            const isInList = course.qualifiedTutors.includes(tutorId);

            if (isQualified && !isInList) {
                // Add tutor to this course's qualified list
                course.qualifiedTutors.push(tutorId);
            } else if (!isQualified && isInList) {
                // Remove tutor from this course's qualified list
                course.qualifiedTutors = course.qualifiedTutors.filter(id => id !== tutorId);
            }
        });
    }

    syncCourseToTutors(courseId, qualifiedTutorIds) {
        // For each tutor, add or remove this course from canTeach
        this.tutors.forEach(tutor => {
            if (!tutor.canTeach) tutor.canTeach = [];

            const canTeachThis = qualifiedTutorIds.includes(tutor.id);
            const isInList = tutor.canTeach.includes(courseId);

            if (canTeachThis && !isInList) {
                // Add course to this tutor's canTeach list
                tutor.canTeach.push(courseId);
            } else if (!canTeachThis && isInList) {
                // Remove course from this tutor's canTeach list
                tutor.canTeach = tutor.canTeach.filter(id => id !== courseId);
            }
        });
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
            document.getElementById('location-id').value = ''; // Explicitly clear ID for new location
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

        if (courseId) {
            const course = this.courses.find(c => c.id === courseId);
            if (course) {
                document.getElementById('course-modal-title').textContent = 'Edit Course';
                document.getElementById('course-id').value = course.id;
                document.getElementById('course-name').value = course.name;
                document.getElementById('course-color').value = course.color;
                this.updateColorPreview(course.color);
                document.getElementById('course-funded').checked = course.funded || false;
                document.getElementById('course-start-week').value = course.startWeek;
                document.getElementById('course-duration').value = course.duration;

                // Set day checkboxes (handle both old and new format)
                const courseDays = course.daysOfWeek || [course.dayOfWeek];
                document.querySelectorAll('input[name="course-day"]').forEach(checkbox => {
                    checkbox.checked = courseDays.includes(parseInt(checkbox.value));
                });

                document.getElementById('course-start-time').value = course.startTime;
                document.getElementById('course-end-time').value = course.endTime;
                document.getElementById('course-notes').value = course.notes || '';
                document.getElementById('course-students').value = course.studentCount || '';

                // Populate qualified tutors checkboxes FIRST
                this.populateCourseQualifiedTutors(course.qualifiedTutors || []);

                // NOW populate dropdowns with color coding (after qualified tutors are set)
                this.populateTutorDropdown();
                this.populateLocationDropdown();

                // Set tutor and location values
                document.getElementById('course-tutor').value = course.tutorId;
                document.getElementById('course-location').value = course.locationId;

                // Show delete and duplicate buttons for existing courses
                document.getElementById('btn-delete-course').style.display = 'block';
                document.getElementById('btn-duplicate-course').style.display = 'block';

                // Check availability with current values
                setTimeout(() => this.checkCourseFormAvailability(), 100);
            }
        } else {
            document.getElementById('course-modal-title').textContent = 'Add Course';
            document.getElementById('course-id').value = ''; // Explicitly clear ID for new course
            const randomColor = this.getRandomColor();
            document.getElementById('course-color').value = randomColor;
            this.updateColorPreview(randomColor);

            // Uncheck all day checkboxes for new course
            document.querySelectorAll('input[name="course-day"]').forEach(checkbox => {
                checkbox.checked = false;
            });

            // Populate qualified tutors checkboxes (empty for new course)
            this.populateCourseQualifiedTutors([]);

            // Populate dropdowns with color coding
            this.populateTutorDropdown();
            this.populateLocationDropdown();

            // Hide delete and duplicate buttons for new courses
            document.getElementById('btn-delete-course').style.display = 'none';
            document.getElementById('btn-duplicate-course').style.display = 'none';
        }

        this.openModal('modal-course');

        // Focus on course name field to bring modal to top
        setTimeout(() => {
            document.getElementById('course-name').focus();
        }, 150);
    }

    updateColorPreview(color) {
        const preview = document.getElementById('color-preview');
        preview.style.backgroundColor = color + '40'; // Add transparency
        preview.style.borderColor = color;
        preview.style.color = color;
        preview.textContent = color.toUpperCase();
    }

    updateResourceDropdowns() {
        this.populateTutorDropdown();
        this.populateLocationDropdown();
    }

    populateTutorDropdown() {
        const tutorSelect = document.getElementById('course-tutor');
        const currentTutorId = tutorSelect.value; // Preserve selection

        // Get current form values
        const courseId = document.getElementById('course-id').value;
        const dayCheckboxes = document.querySelectorAll('input[name="course-day"]:checked');
        const daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
        const startTime = document.getElementById('course-start-time').value;
        const endTime = document.getElementById('course-end-time').value;
        const startWeek = parseInt(document.getElementById('course-start-week').value) || 1;
        const duration = parseInt(document.getElementById('course-duration').value) || 1;

        // Get qualified tutor IDs from checkboxes
        const qualifiedTutorIds = [];
        document.querySelectorAll('input[name="qualified-tutor"]:checked').forEach(cb => {
            qualifiedTutorIds.push(cb.value);
        });

        // If this is an existing course being edited, also get qualified tutors from the course data
        // This handles the case when the modal first opens before user interacts with checkboxes
        let courseQualifiedTutors = [];
        if (courseId) {
            const course = this.courses.find(c => c.id === courseId);
            if (course && course.qualifiedTutors) {
                courseQualifiedTutors = course.qualifiedTutors;
            }
        }

        // Use checkboxes if any are checked, otherwise use course data
        const effectiveQualifiedTutors = qualifiedTutorIds.length > 0 ? qualifiedTutorIds : courseQualifiedTutors;

        let html = '<option value="">Select Tutor</option>';
        html += '<option value="none">No Tutor Yet</option>';

        // Check each tutor
        this.tutors.forEach(tutor => {
            let status = [];
            let statusEmoji = '🟢'; // Default green

            // Check qualification
            const isQualified = effectiveQualifiedTutors.length === 0 || effectiveQualifiedTutors.includes(tutor.id);
            if (!isQualified) {
                status.push('Not Qualified');
                statusEmoji = '🔴';
            } else {
                status.push('Qualified');
            }

            // Check availability
            if (daysOfWeek.length > 0 && startTime && endTime) {
                let allDaysAvailable = true;
                daysOfWeek.forEach(day => {
                    if (!this.checkTutorAvailability(tutor.id, day, startTime, endTime)) {
                        allDaysAvailable = false;
                    }
                });

                if (!allDaysAvailable) {
                    status.push('Not Available');
                    statusEmoji = '🔴';
                } else {
                    status.push('Available');
                }

                // Check conflicts
                const hasConflict = this.checkTutorConflict(tutor.id, courseId, daysOfWeek, startTime, endTime, startWeek, duration);
                if (hasConflict) {
                    status.push('Conflict');
                    statusEmoji = '🔴';
                }
            }

            // Change emoji based on status
            if (statusEmoji === '🔴') {
                // Already red
            } else if (status.includes('Not Available') || status.includes('Conflict')) {
                statusEmoji = '🟡';
            }

            const statusText = status.join(', ');
            html += `<option value="${tutor.id}">${statusEmoji} ${tutor.name} (${statusText})</option>`;
        });

        tutorSelect.innerHTML = html;
        tutorSelect.value = currentTutorId; // Restore selection
    }

    populateLocationDropdown() {
        const locationSelect = document.getElementById('course-location');
        const currentLocationId = locationSelect.value; // Preserve selection

        // Get current form values
        const courseId = document.getElementById('course-id').value;
        const dayCheckboxes = document.querySelectorAll('input[name="course-day"]:checked');
        const daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
        const startTime = document.getElementById('course-start-time').value;
        const endTime = document.getElementById('course-end-time').value;
        const startWeek = parseInt(document.getElementById('course-start-week').value) || 1;
        const duration = parseInt(document.getElementById('course-duration').value) || 1;
        const studentCount = parseInt(document.getElementById('course-students').value) || 0;

        let html = '<option value="">Select Location</option>';
        html += '<option value="none">No Location Yet</option>';

        // Check each location
        this.locations.forEach(location => {
            let status = [];
            let statusEmoji = '🟢'; // Default green

            // Check capacity first (if student count is provided)
            if (studentCount > 0 && location.capacity) {
                if (studentCount > location.capacity) {
                    status.push(`Capacity: ${location.capacity} (need ${studentCount})`);
                    statusEmoji = '🔴';
                } else {
                    status.push(`Capacity: ${location.capacity}`);
                }
            } else if (location.capacity) {
                status.push(`Capacity: ${location.capacity}`);
            }

            // Check availability
            if (daysOfWeek.length > 0 && startTime && endTime) {
                let allDaysAvailable = true;
                daysOfWeek.forEach(day => {
                    if (!this.checkLocationAvailability(location.id, day, startTime, endTime)) {
                        allDaysAvailable = false;
                    }
                });

                if (!allDaysAvailable) {
                    status.push('Not Available');
                    statusEmoji = '🔴';
                } else {
                    status.push('Available');
                }

                // Check conflicts
                const hasConflict = this.checkLocationConflict(location.id, courseId, daysOfWeek, startTime, endTime, startWeek, duration);
                if (hasConflict) {
                    status.push('Conflict');
                    statusEmoji = '🔴';
                }
            } else {
                status.push('Available');
            }

            // Change emoji based on status
            if (statusEmoji === '🔴') {
                // Already red
            } else if (status.includes('Not Available') || status.includes('Conflict')) {
                statusEmoji = '🟡';
            }

            const statusText = status.join(', ');
            html += `<option value="${location.id}">${statusEmoji} ${location.name} (${statusText})</option>`;
        });

        locationSelect.innerHTML = html;
        locationSelect.value = currentLocationId; // Restore selection
    }

    timesOverlap(start1, end1, start2, end2) {
        const start1Minutes = this.timeToMinutes(start1);
        const end1Minutes = this.timeToMinutes(end1);
        const start2Minutes = this.timeToMinutes(start2);
        const end2Minutes = this.timeToMinutes(end2);

        return !(end1Minutes <= start2Minutes || end2Minutes <= start1Minutes);
    }

    checkTutorConflict(tutorId, excludeCourseId, daysOfWeek, startTime, endTime, startWeek, duration) {
        const otherCourses = this.courses.filter(c => c.id !== excludeCourseId && c.tutorId === tutorId);

        for (const course of otherCourses) {
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const hasSharedDay = daysOfWeek.some(day => courseDays.includes(day));

            if (hasSharedDay && this.timesOverlap(startTime, endTime, course.startTime, course.endTime)) {
                const weekStart = startWeek;
                const weekEnd = startWeek + duration - 1;
                const courseWeekStart = course.startWeek;
                const courseWeekEnd = course.startWeek + course.duration - 1;

                if (!(weekEnd < courseWeekStart || weekStart > courseWeekEnd)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkLocationConflict(locationId, excludeCourseId, daysOfWeek, startTime, endTime, startWeek, duration) {
        const otherCourses = this.courses.filter(c => c.id !== excludeCourseId && c.locationId === locationId);

        for (const course of otherCourses) {
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const hasSharedDay = daysOfWeek.some(day => courseDays.includes(day));

            if (hasSharedDay && this.timesOverlap(startTime, endTime, course.startTime, course.endTime)) {
                const weekStart = startWeek;
                const weekEnd = startWeek + duration - 1;
                const courseWeekStart = course.startWeek;
                const courseWeekEnd = course.startWeek + course.duration - 1;

                if (!(weekEnd < courseWeekStart || weekStart > courseWeekEnd)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkCourseFormAvailability() {
        const courseId = document.getElementById('course-id').value;
        const tutorId = document.getElementById('course-tutor').value;
        const locationId = document.getElementById('course-location').value;

        // Get all checked days
        const dayCheckboxes = document.querySelectorAll('input[name="course-day"]:checked');
        const daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));

        const startTime = document.getElementById('course-start-time').value;
        const endTime = document.getElementById('course-end-time').value;
        const startWeek = parseInt(document.getElementById('course-start-week').value);
        const duration = parseInt(document.getElementById('course-duration').value);

        const tutorWarning = document.getElementById('tutor-availability-warning');
        const locationWarning = document.getElementById('location-availability-warning');
        const conflictWarning = document.getElementById('course-conflicts-warning');
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // Check tutor availability for all selected days
        if (tutorId && tutorId !== 'none' && daysOfWeek.length > 0 && startTime && endTime) {
            const tutorName = this.getTutorName(tutorId);
            const courseId = document.getElementById('course-id').value;
            const course = courseId ? this.courses.find(c => c.id === courseId) : null;
            const qualifiedTutorIds = course ? (course.qualifiedTutors || []) : [];

            // Check if tutor is qualified
            const isQualified = qualifiedTutorIds.length === 0 || qualifiedTutorIds.includes(tutorId);

            const tutorUnavailableDays = [];

            daysOfWeek.forEach(day => {
                if (!this.checkTutorAvailability(tutorId, day, startTime, endTime)) {
                    tutorUnavailableDays.push(days[day]);
                }
            });

            if (!isQualified) {
                // Tutor is not qualified - show error
                tutorWarning.className = 'availability-warning error';
                tutorWarning.textContent = `${tutorName} is NOT qualified to teach this course. Please select a qualified tutor from the "Qualified Tutors" list below.`;
                tutorWarning.style.display = 'flex';
                tutorWarning.style.cursor = 'default';
                tutorWarning.onclick = null;
            } else if (tutorUnavailableDays.length === 0) {
                tutorWarning.className = 'availability-warning success';
                const daysList = daysOfWeek.map(d => days[d]).join(', ');
                tutorWarning.textContent = `${tutorName} is available on ${daysList} at this time`;
                tutorWarning.style.display = 'flex';
                tutorWarning.style.cursor = 'default';
                tutorWarning.onclick = null;
            } else {
                // Find available AND qualified tutors
                const courseId = document.getElementById('course-id').value;
                const course = courseId ? this.courses.find(c => c.id === courseId) : null;
                const qualifiedTutorIds = course ? (course.qualifiedTutors || []) : [];

                const availableTutors = this.tutors.filter(tutor => {
                    if (tutor.id === tutorId) return false; // Skip current tutor

                    // Check if tutor is qualified for this course
                    const isQualified = qualifiedTutorIds.length === 0 || qualifiedTutorIds.includes(tutor.id);
                    if (!isQualified) return false;

                    // Check if tutor is available on ALL selected days
                    return daysOfWeek.every(day =>
                        this.checkTutorAvailability(tutor.id, day, startTime, endTime)
                    );
                });

                const alternativesId = 'tutor-alternatives-' + tutorId;
                let alternativesHtml = '';

                if (availableTutors.length > 0) {
                    alternativesHtml = `
                        <div id="${alternativesId}" style="display: none; margin-top: 0.5rem; padding: 0.5rem; background: #fff; border-radius: 4px; border: 1px solid #ddd;">
                            <div style="font-weight: 600; margin-bottom: 0.3rem;">Available tutors (${availableTutors.length}):</div>
                            ${availableTutors.map(tutor => `
                                <div style="padding: 0.3rem; cursor: pointer; border-radius: 3px; margin-bottom: 0.2rem;"
                                     onmouseover="this.style.background='#f0f0f0'"
                                     onmouseout="this.style.background='transparent'"
                                     onclick="document.getElementById('course-tutor').value='${tutor.id}'; planner.checkCourseFormAvailability();">
                                    • ${tutor.name}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                tutorWarning.className = 'availability-warning warning';
                tutorWarning.innerHTML = `
                    <div style="flex: 1;">
                        <div>
                            ${tutorName} is NOT marked as available on ${tutorUnavailableDays.join(', ')} during ${startTime}-${endTime}
                        </div>
                        ${availableTutors.length > 0 ? `
                            <div style="margin-top: 0.5rem;">
                                <span onclick="document.getElementById('${alternativesId}').style.display = document.getElementById('${alternativesId}').style.display === 'none' ? 'block' : 'none';"
                                      style="color: #2563eb; cursor: pointer; text-decoration: underline; font-size: 0.9em;">
                                    ${availableTutors.length === 1 ? '▼ Show available tutor' : `▼ Show available tutors (${availableTutors.length})`}
                                </span>
                            </div>
                        ` : ''}
                        ${alternativesHtml}
                    </div>
                    <div onclick="planner.closeModal('modal-course'); planner.openTutorModal('${tutorId}');"
                         style="cursor: pointer; padding: 0.3rem 0.5rem; color: #666; font-size: 0.85em; opacity: 0.8; white-space: nowrap;"
                         onmouseover="this.style.opacity='1'"
                         onmouseout="this.style.opacity='0.8'">
                        (edit tutor)
                    </div>
                `;
                tutorWarning.style.display = 'flex';
            }
        } else {
            tutorWarning.style.display = 'none';
        }

        // Check location availability for all selected days
        if (locationId && locationId !== 'none' && daysOfWeek.length > 0 && startTime && endTime) {
            const locationName = this.getLocationName(locationId);
            const locationUnavailableDays = [];

            daysOfWeek.forEach(day => {
                if (!this.checkLocationAvailability(locationId, day, startTime, endTime)) {
                    locationUnavailableDays.push(days[day]);
                }
            });

            if (locationUnavailableDays.length === 0) {
                locationWarning.className = 'availability-warning success';
                const daysList = daysOfWeek.map(d => days[d]).join(', ');
                locationWarning.textContent = `${locationName} is available on ${daysList} at this time`;
                locationWarning.style.display = 'flex';
                locationWarning.style.cursor = 'default';
                locationWarning.onclick = null;
            } else {
                // Find available locations
                const availableLocations = this.locations.filter(location => {
                    if (location.id === locationId) return false; // Skip current location
                    // Check if location is available on ALL selected days
                    return daysOfWeek.every(day =>
                        this.checkLocationAvailability(location.id, day, startTime, endTime)
                    );
                });

                const alternativesId = 'location-alternatives-' + locationId;
                let alternativesHtml = '';

                if (availableLocations.length > 0) {
                    alternativesHtml = `
                        <div id="${alternativesId}" style="display: none; margin-top: 0.5rem; padding: 0.5rem; background: #fff; border-radius: 4px; border: 1px solid #ddd;">
                            <div style="font-weight: 600; margin-bottom: 0.3rem;">Available locations (${availableLocations.length}):</div>
                            ${availableLocations.map(location => `
                                <div style="padding: 0.3rem; cursor: pointer; border-radius: 3px; margin-bottom: 0.2rem;"
                                     onmouseover="this.style.background='#f0f0f0'"
                                     onmouseout="this.style.background='transparent'"
                                     onclick="document.getElementById('course-location').value='${location.id}'; planner.checkCourseFormAvailability();">
                                    • ${location.name}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }

                locationWarning.className = 'availability-warning warning';
                locationWarning.innerHTML = `
                    <div style="flex: 1;">
                        <div>
                            ${locationName} is NOT marked as available on ${locationUnavailableDays.join(', ')} during ${startTime}-${endTime}
                        </div>
                        ${availableLocations.length > 0 ? `
                            <div style="margin-top: 0.5rem;">
                                <span onclick="document.getElementById('${alternativesId}').style.display = document.getElementById('${alternativesId}').style.display === 'none' ? 'block' : 'none';"
                                      style="color: #2563eb; cursor: pointer; text-decoration: underline; font-size: 0.9em;">
                                    ${availableLocations.length === 1 ? '▼ Show available location' : `▼ Show available locations (${availableLocations.length})`}
                                </span>
                            </div>
                        ` : ''}
                        ${alternativesHtml}
                    </div>
                    <div onclick="planner.closeModal('modal-course'); planner.openLocationModal('${locationId}');"
                         style="cursor: pointer; padding: 0.3rem 0.5rem; color: #666; font-size: 0.85em; opacity: 0.8; white-space: nowrap;"
                         onmouseover="this.style.opacity='1'"
                         onmouseout="this.style.opacity='0.8'">
                        (edit location)
                    </div>
                `;
                locationWarning.style.display = 'flex';
            }
        } else {
            locationWarning.style.display = 'none';
        }

        // Check for conflicts
        if (tutorId && locationId && daysOfWeek.length > 0 && startTime && endTime && !isNaN(startWeek) && !isNaN(duration)) {
            const tempCourse = {
                id: courseId || 'temp',
                tutorId,
                locationId,
                daysOfWeek,
                startTime,
                endTime,
                startWeek,
                duration
            };

            const conflicts = this.checkCourseConflicts(tempCourse);

            if (conflicts.length > 0) {
                conflictWarning.className = 'availability-warning error';
                conflictWarning.style.cursor = 'default';

                // Create clickable conflict messages
                const conflictHtml = conflicts.map(c => {
                    const courseName = c.conflictingCourse.name;
                    const courseColor = c.conflictingCourse.color;
                    const courseId = c.conflictingCourse.id;

                    // Parse the message to insert clickable course name
                    let message = c.message;
                    const quotePattern = `"${courseName}"`;
                    const parts = message.split(quotePattern);

                    return `<div style="margin-bottom: 0.3rem;">${parts[0]}<span onclick="planner.closeModal('modal-course'); planner.openCourseModal('${courseId}');" style="color: ${courseColor}; font-weight: 600; cursor: pointer; text-decoration: underline; white-space: nowrap;">"${courseName}"</span>${parts[1] || ''}</div>`;
                }).join('');

                conflictWarning.innerHTML = `<div><strong>Conflicts detected:</strong>${conflictHtml}<div style="font-size: 0.85em; opacity: 0.8; margin-top: 0.3rem;">(click course name to edit)</div></div>`;
                conflictWarning.style.display = 'flex';
            } else {
                conflictWarning.style.display = 'none';
            }
        } else {
            conflictWarning.style.display = 'none';
        }

        // Check room capacity
        const capacityWarning = document.getElementById('capacity-warning');
        const studentCount = parseInt(document.getElementById('course-students').value);

        if (locationId && locationId !== 'none' && studentCount) {
            const location = this.locations.find(l => l.id === locationId);
            if (location && location.capacity) {
                if (studentCount > location.capacity) {
                    capacityWarning.className = 'availability-warning error';
                    capacityWarning.textContent = `⚠️ Room capacity exceeded! ${location.name} has capacity for ${location.capacity} students, but ${studentCount} students are expected.`;
                    capacityWarning.style.display = 'flex';
                } else {
                    capacityWarning.className = 'availability-warning success';
                    capacityWarning.textContent = `✓ Room capacity OK: ${studentCount} students in ${location.name} (capacity: ${location.capacity})`;
                    capacityWarning.style.display = 'flex';
                }
            } else {
                capacityWarning.style.display = 'none';
            }
        } else {
            capacityWarning.style.display = 'none';
        }
    }

    saveCourse(e) {
        e.preventDefault();

        const courseId = document.getElementById('course-id').value || this.generateId();
        const name = document.getElementById('course-name').value;
        const color = document.getElementById('course-color').value;
        const funded = document.getElementById('course-funded').checked;
        const tutorId = document.getElementById('course-tutor').value;
        const locationId = document.getElementById('course-location').value;
        const startWeek = parseInt(document.getElementById('course-start-week').value);
        const duration = parseInt(document.getElementById('course-duration').value);

        // Get all checked days
        const dayCheckboxes = document.querySelectorAll('input[name="course-day"]:checked');
        const daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));

        if (daysOfWeek.length === 0) {
            alert('Please select at least one day of the week');
            return;
        }

        const startTime = document.getElementById('course-start-time').value;
        const endTime = document.getElementById('course-end-time').value;
        const notes = document.getElementById('course-notes').value;
        const studentCount = parseInt(document.getElementById('course-students').value) || null;

        // Get qualified tutors (selected tutors)
        const qualifiedTutors = [];
        document.querySelectorAll('input[name="qualified-tutor"]:checked').forEach(checkbox => {
            qualifiedTutors.push(checkbox.value);
        });

        const course = {
            id: courseId,
            name,
            color,
            funded,
            tutorId,
            locationId,
            startWeek,
            duration,
            daysOfWeek, // Array of days instead of single dayOfWeek
            startTime,
            endTime,
            notes,
            studentCount,
            qualifiedTutors
        };

        // Check tutor availability for all selected days
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const tutorUnavailableDays = [];
        daysOfWeek.forEach(day => {
            if (!this.checkTutorAvailability(tutorId, day, startTime, endTime)) {
                tutorUnavailableDays.push(days[day]);
            }
        });
        if (tutorUnavailableDays.length > 0) {
            const tutorName = this.getTutorName(tutorId);
            if (!confirm(`Warning: ${tutorName} is not marked as available on ${tutorUnavailableDays.join(', ')} during ${startTime}-${endTime}.\n\nDo you want to schedule this course anyway?`)) {
                return;
            }
        }

        // Check location availability for all selected days
        const locationUnavailableDays = [];
        daysOfWeek.forEach(day => {
            if (!this.checkLocationAvailability(locationId, day, startTime, endTime)) {
                locationUnavailableDays.push(days[day]);
            }
        });
        if (locationUnavailableDays.length > 0) {
            const locationName = this.getLocationName(locationId);
            if (!confirm(`Warning: ${locationName} is not marked as available on ${locationUnavailableDays.join(', ')} during ${startTime}-${endTime}.\n\nDo you want to schedule this course anyway?`)) {
                return;
            }
        }

        // Check for double-booking conflicts on all days
        const conflicts = this.checkCourseConflicts(course);
        if (conflicts.length > 0) {
            const conflictMessages = conflicts.map(c => `- ${c.message}`).join('\n');
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

        // Sync: Update canTeach in tutors based on this course's qualifiedTutors
        this.syncCourseToTutors(courseId, qualifiedTutors);

        this.saveData();
        this.closeModal('modal-course');

        // Always re-render calendar to update colors
        if (this.currentView === 'courses') {
            this.renderCalendar();
            this.populateCourseSelector();
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
            this.populateCourseSelector();
            if (this.currentView === 'dashboard') this.renderDashboard();
        }
    }

    // Calendar Rendering
    changeWeekOffset(change) {
        this.calendarWeekOffset += change;
        if (this.calendarWeekOffset < 0) this.calendarWeekOffset = 0;
        if (this.calendarWeekOffset > 36) this.calendarWeekOffset = 36; // Max offset 36 = Week 37-40 visible
        this.renderCalendar();
    }

    jumpToToday() {
        const currentWeek = this.getCurrentWeek();
        if (!currentWeek) {
            alert('Please set Week 1 start date in the Dashboard first');
            return;
        }

        // Calculate which offset shows the current week
        if (this.calendarViewMode === 'week') {
            this.calendarWeekOffset = currentWeek - 1;
        } else if (this.calendarViewMode === '4weeks') {
            // Show current week in the first 4-week block that contains it
            this.calendarWeekOffset = Math.floor((currentWeek - 1) / 4) * 4;
        } else if (this.calendarViewMode === 'month') {
            // Show current week in the first month block that contains it
            this.calendarWeekOffset = Math.floor((currentWeek - 1) / 16) * 16;
        }

        // Ensure within bounds
        if (this.calendarWeekOffset < 0) this.calendarWeekOffset = 0;
        if (this.calendarWeekOffset > 36) this.calendarWeekOffset = 36;

        this.renderCalendar();
    }

    jumpToWeekPrompt() {
        const weekNum = prompt('Jump to week (1-40):');
        if (!weekNum) return;

        const targetWeek = parseInt(weekNum);
        if (isNaN(targetWeek) || targetWeek < 1 || targetWeek > 40) {
            alert('Please enter a valid week number between 1 and 40');
            return;
        }

        // Calculate offset to show the target week
        if (this.calendarViewMode === 'week') {
            this.calendarWeekOffset = targetWeek - 1;
        } else if (this.calendarViewMode === '4weeks') {
            this.calendarWeekOffset = Math.floor((targetWeek - 1) / 4) * 4;
        } else if (this.calendarViewMode === 'month') {
            this.calendarWeekOffset = Math.floor((targetWeek - 1) / 16) * 16;
        }

        // Ensure within bounds
        if (this.calendarWeekOffset < 0) this.calendarWeekOffset = 0;
        if (this.calendarWeekOffset > 36) this.calendarWeekOffset = 36;

        this.renderCalendar();
    }

    filterCoursesBySearch(searchTerm) {
        const term = searchTerm.toLowerCase().trim();
        if (!term) {
            // Clear filter - show all courses
            document.querySelectorAll('.course-block').forEach(block => {
                block.style.display = '';
            });
            return;
        }

        // Find all matching courses in the data
        const matchingCourses = this.courses.filter(course =>
            course.name.toLowerCase().includes(term)
        );

        if (matchingCourses.length === 0) {
            alert('No courses found matching: ' + searchTerm);
            return;
        }

        // Find the earliest week with a matching course
        const earliestWeek = Math.min(...matchingCourses.map(c => c.startWeek));

        // Jump to that week if not currently visible
        const startWeek = this.calendarWeekOffset + 1;
        let weeksToShow = 4;
        if (this.calendarViewMode === 'week') {
            weeksToShow = 1;
        } else if (this.calendarViewMode === 'month') {
            weeksToShow = 4;
        }
        const endWeek = startWeek + weeksToShow - 1;

        // If the earliest matching course is not in the current view, jump to it
        if (earliestWeek < startWeek || earliestWeek > endWeek) {
            if (this.calendarViewMode === 'week') {
                this.calendarWeekOffset = earliestWeek - 1;
            } else if (this.calendarViewMode === '4weeks') {
                this.calendarWeekOffset = Math.floor((earliestWeek - 1) / 4) * 4;
            } else if (this.calendarViewMode === 'month') {
                this.calendarWeekOffset = Math.floor((earliestWeek - 1) / 16) * 16;
            }
            this.renderCalendar();
        }

        // Filter course blocks to show only matches
        document.querySelectorAll('.course-block').forEach(block => {
            const courseName = block.querySelector('.course-name').textContent.toLowerCase();
            const courseDetails = block.querySelector('.course-details')?.textContent.toLowerCase() || '';

            if (courseName.includes(term) || courseDetails.includes(term)) {
                block.style.display = '';
            } else {
                block.style.display = 'none';
            }
        });
    }

    duplicateCourse() {
        const courseId = document.getElementById('course-id').value;
        if (!courseId) {
            alert('No course to duplicate');
            return;
        }

        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            alert('Course not found');
            return;
        }

        // Close current modal
        this.closeModal('modal-course');

        // Create a copy with a new ID
        const newCourse = {
            ...course,
            id: this.generateId(),
            name: course.name + ' (Copy)'
        };

        // Add to courses array
        this.courses.push(newCourse);
        this.saveData();

        // Sync qualifications
        this.syncCourseToTutors(newCourse.id, newCourse.qualifiedTutors || []);
        this.saveData();

        // Re-render and open the new course for editing
        this.renderCalendar();
        this.populateCourseSelector();
        this.openCourseModal(newCourse.id);

        alert(`Course duplicated! You can now modify "${newCourse.name}"`);
    }

    populateCourseSelector() {
        const selector = document.getElementById('course-selector');
        if (!selector) return;

        const sortedCourses = [...this.courses].sort((a, b) => {
            if (a.startWeek !== b.startWeek) return a.startWeek - b.startWeek;
            // Sort by first day in the array for multi-day courses
            const aFirstDay = a.daysOfWeek ? a.daysOfWeek[0] : a.dayOfWeek;
            const bFirstDay = b.daysOfWeek ? b.daysOfWeek[0] : b.dayOfWeek;
            if (aFirstDay !== bFirstDay) return aFirstDay - bFirstDay;
            return a.name.localeCompare(b.name);
        });

        selector.innerHTML = '<option value="">Select a course...</option>' +
            sortedCourses.map(course => {
                const weekEnd = course.startWeek + course.duration - 1;
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                // Show all days for multi-day courses
                const courseDays = course.daysOfWeek || [course.dayOfWeek];
                const daysList = courseDays.map(d => days[d]).join('/');
                return `<option value="${course.id}">${course.name} (${daysList} Wk${course.startWeek}${course.duration > 1 ? `-${weekEnd}` : ''})</option>`;
            }).join('');
    }

    renderCalendar() {
        const container = document.getElementById('calendar-grid');
        let weeksToShow;
        if (this.calendarViewMode === 'week') {
            weeksToShow = 1;
        } else if (this.calendarViewMode === 'month') {
            weeksToShow = 4;
        } else {
            weeksToShow = 4; // Default for '4weeks' mode
        }
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
                const dayOfWeek = i === 7 ? 0 : i;
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                html += `<div class="calendar-header calendar-day-header ${isWeekend ? 'weekend' : ''}">${days[i]}</div>`;
            }
        }

        // Time slots and cells
        timeSlots.forEach(time => {
            html += `<div class="calendar-time-label">${time}</div>`;

            for (let week = startWeek; week <= endWeek; week++) {
                for (let day = 1; day <= 7; day++) {
                    const dayOfWeek = day === 7 ? 0 : day;
                    const coursesAtSlot = this.getCoursesAtTimeSlot(week, week, dayOfWeek, time);
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

                    html += `<div class="calendar-cell ${coursesAtSlot.length > 0 ? 'has-course' : ''} ${isWeekend ? 'weekend' : ''}"
                             data-week="${week}" data-day="${dayOfWeek}" data-time="${time}">`;

                    coursesAtSlot.forEach(course => {
                        const tutor = this.tutors.find(t => t.id === course.tutorId);
                        const location = this.locations.find(l => l.id === course.locationId);

                        // Check if this specific course has a conflict
                        const courseHasConflict = this.checkCourseConflicts(course).length > 0;

                        // Check if resources are available (use dayOfWeek from the current cell we're rendering)
                        const tutorAvailable = course.tutorId === 'none' || this.checkTutorAvailability(course.tutorId, dayOfWeek, course.startTime, course.endTime);
                        const locationAvailable = course.locationId === 'none' || this.checkLocationAvailability(course.locationId, dayOfWeek, course.startTime, course.endTime);
                        const hasAvailabilityIssue = !tutorAvailable || !locationAvailable;

                        // Check if tutor is qualified
                        const qualifiedTutors = course.qualifiedTutors || [];
                        const hasQualificationIssue = course.tutorId && course.tutorId !== 'none' &&
                                                       qualifiedTutors.length > 0 &&
                                                       !qualifiedTutors.includes(course.tutorId);

                        // Check if room capacity is exceeded
                        const hasCapacityIssue = course.studentCount && location && location.capacity &&
                                                 course.studentCount > location.capacity;

                        // Show indicator if there's a conflict, availability issue, qualification issue, OR capacity issue
                        const hasIssue = courseHasConflict || hasAvailabilityIssue || hasQualificationIssue || hasCapacityIssue;

                        // Use course custom color for background and left border
                        const courseColor = course.color;

                        // Use funded/non-funded color for top and right borders
                        const fundedColor = course.funded
                            ? this.settings.fundedCourseColor
                            : this.settings.nonFundedCourseColor;

                        // Use dashed borders for non-funded courses
                        const borderStyle = course.funded ? 'solid' : 'dashed';

                        html += `
                            <div class="course-block ${hasIssue ? 'conflict' : ''}"
                                 style="background-color: ${courseColor}20;
                                        border-left-color: ${courseColor};
                                        border-top: 3px ${borderStyle} ${fundedColor};
                                        border-right: 3px ${borderStyle} ${fundedColor};"
                                 onclick="planner.openCourseModal('${course.id}')">
                                ${hasIssue ? '<span class="conflict-indicator">!</span>' : ''}
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

            // Handle both old and new day format
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const runsOnThisDay = courseDays.includes(dayOfWeek);

            if (!inWeekRange || !runsOnThisDay) return false;

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
                            message: `Tutor ${this.getTutorName(course.tutorId)} is double-booked: "${course.name}" and "${otherCourse.name}"`,
                            course1: course,
                            course2: otherCourse
                        });
                    }

                    if (course.locationId === otherCourse.locationId) {
                        conflicts.push({
                            type: 'error',
                            message: `Location ${this.getLocationName(course.locationId)} is double-booked: "${course.name}" and "${otherCourse.name}"`,
                            course1: course,
                            course2: otherCourse
                        });
                    }
                }
            });
        });

        return conflicts;
    }

    coursesOverlap(course1, course2) {
        // Get days arrays for both courses (handle old single-day format)
        const c1Days = course1.daysOfWeek || [course1.dayOfWeek];
        const c2Days = course2.daysOfWeek || [course2.dayOfWeek];

        // Check if they share any common day
        const hasCommonDay = c1Days.some(day => c2Days.includes(day));
        if (!hasCommonDay) return false;

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
        if (tutorId === 'none') return 'No tutor';
        const tutor = this.tutors.find(t => t.id === tutorId);
        return tutor ? tutor.name : 'Unknown';
    }

    getLocationName(locationId) {
        if (locationId === 'none') return 'No location';
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
                // Check for tutor conflict (skip if either course has no tutor)
                if (newCourse.tutorId && newCourse.tutorId !== 'none' &&
                    existingCourse.tutorId && existingCourse.tutorId !== 'none' &&
                    newCourse.tutorId === existingCourse.tutorId) {
                    const tutorName = this.getTutorName(newCourse.tutorId);
                    conflicts.push({
                        message: `Tutor "${tutorName}" is already teaching "${existingCourse.name}" at this time`,
                        conflictingCourse: existingCourse
                    });
                }

                // Check for location conflict (skip if either course has no location)
                if (newCourse.locationId && newCourse.locationId !== 'none' &&
                    existingCourse.locationId && existingCourse.locationId !== 'none' &&
                    newCourse.locationId === existingCourse.locationId) {
                    const locationName = this.getLocationName(newCourse.locationId);
                    conflicts.push({
                        message: `Location "${locationName}" is already being used for "${existingCourse.name}" at this time`,
                        conflictingCourse: existingCourse
                    });
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
            case 'tutor-workload':
                this.generateTutorWorkloadReport(container);
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
            case 'unavailable-resources':
                this.generateUnavailableResourcesReport(container);
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
                                ${tutorCourses.map(course => {
                                    const courseDays = course.daysOfWeek || [course.dayOfWeek];
                                    const daysList = courseDays.map(d => days[d]).join('/');

                                    // Check if this course has any conflicts
                                    const conflicts = this.checkCourseConflicts(course);
                                    const hasConflict = conflicts.length > 0;
                                    const rowStyle = hasConflict ? 'background-color: #ffebee; cursor: pointer;' : 'cursor: pointer;';

                                    return `
                                    <tr class="clickable-row" onclick="planner.openCourseModal('${course.id}')" style="${rowStyle}">
                                        <td>${course.name}</td>
                                        <td>${daysList}</td>
                                        <td>${course.startTime} - ${course.endTime}</td>
                                        <td>${course.startWeek}-${course.startWeek + course.duration - 1}</td>
                                        <td>${this.getLocationName(course.locationId)}</td>
                                    </tr>
                                `;}).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    generateTutorWorkloadReport(container) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Calculate hours for each tutor per week
        const tutorWorkload = [];

        this.tutors.forEach(tutor => {
            const weeklyHours = new Array(40).fill(0); // 40 weeks

            // Get all courses for this tutor
            const tutorCourses = this.courses.filter(c => c.tutorId === tutor.id);

            tutorCourses.forEach(course => {
                // Calculate hours per session
                const startParts = course.startTime.split(':');
                const endParts = course.endTime.split(':');
                const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                const hoursPerSession = (endMinutes - startMinutes) / 60;

                // Get number of days per week for this course
                const courseDays = course.daysOfWeek || [course.dayOfWeek];
                const sessionsPerWeek = courseDays.length;

                // Calculate total hours per week for this course
                const hoursPerWeek = hoursPerSession * sessionsPerWeek;

                // Add to each week the course runs
                for (let week = course.startWeek - 1; week < course.startWeek - 1 + course.duration; week++) {
                    if (week >= 0 && week < 40) {
                        weeklyHours[week] += hoursPerWeek;
                    }
                }
            });

            // Calculate statistics
            const totalHours = weeklyHours.reduce((sum, hours) => sum + hours, 0);
            const weeksWorked = weeklyHours.filter(hours => hours > 0).length;
            const averageHours = weeksWorked > 0 ? totalHours / weeksWorked : 0;
            const maxHours = Math.max(...weeklyHours);

            tutorWorkload.push({
                tutor,
                weeklyHours,
                totalHours,
                weeksWorked,
                averageHours,
                maxHours
            });
        });

        // Sort by total hours descending
        tutorWorkload.sort((a, b) => b.totalHours - a.totalHours);

        let html = '<h3>Tutor Workload - Hours per Week</h3>';

        tutorWorkload.forEach(data => {
            html += `
                <div style="margin-bottom: 2rem; padding: 1rem; background: var(--gray-100); border-radius: 8px;">
                    <h4>${data.tutor.name}</h4>
                    <div style="margin-bottom: 1rem;">
                        <p><strong>Total Hours:</strong> ${data.totalHours.toFixed(1)} hours</p>
                        <p><strong>Weeks Worked:</strong> ${data.weeksWorked} / 40</p>
                        <p><strong>Average Hours/Week:</strong> ${data.averageHours.toFixed(1)} hours (when working)</p>
                        <p><strong>Peak Hours/Week:</strong> ${data.maxHours.toFixed(1)} hours</p>
                    </div>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Week</th>
                                <th>Hours</th>
                                <th>Visual</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.weeklyHours.map((hours, index) => {
                                if (hours === 0) return ''; // Skip weeks with no hours
                                const week = index + 1;
                                const barWidth = data.maxHours > 0 ? (hours / data.maxHours * 100) : 0;
                                return `
                                <tr>
                                    <td>Week ${week}</td>
                                    <td>${hours.toFixed(1)} hrs</td>
                                    <td style="min-width: 200px;">
                                        <div style="background: #4CAF50; width: ${barWidth}%; height: 20px; border-radius: 4px; min-width: 20px; display: inline-block;"></div>
                                    </td>
                                </tr>
                            `;}).filter(row => row !== '').join('')}
                        </tbody>
                    </table>
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
                                ${locationCourses.map(course => {
                                    const courseDays = course.daysOfWeek || [course.dayOfWeek];
                                    const daysList = courseDays.map(d => days[d]).join('/');

                                    // Check if this course has any conflicts
                                    const conflicts = this.checkCourseConflicts(course);
                                    const hasConflict = conflicts.length > 0;
                                    const rowStyle = hasConflict ? 'background-color: #ffebee; cursor: pointer;' : 'cursor: pointer;';

                                    return `
                                    <tr class="clickable-row" onclick="planner.openCourseModal('${course.id}')" style="${rowStyle}">
                                        <td>${course.name}</td>
                                        <td>${daysList}</td>
                                        <td>${course.startTime} - ${course.endTime}</td>
                                        <td>${course.startWeek}-${course.startWeek + course.duration - 1}</td>
                                        <td>${this.getTutorName(course.tutorId)}</td>
                                    </tr>
                                `;}).join('')}
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
                    ${sortedCourses.map(course => {
                        const courseDays = course.daysOfWeek || [course.dayOfWeek];
                        const daysList = courseDays.map(d => days[d]).join('/');
                        return `
                        <tr class="clickable-row" onclick="planner.openCourseModal('${course.id}')" style="cursor: pointer;">
                            <td style="border-left: 4px solid ${course.color}">${course.name}</td>
                            <td>${this.getTutorName(course.tutorId)}</td>
                            <td>${this.getLocationName(course.locationId)}</td>
                            <td>${daysList}</td>
                            <td>${course.startTime} - ${course.endTime}</td>
                            <td>${course.startWeek}</td>
                            <td>${course.duration} weeks</td>
                        </tr>
                    `;}).join('')}
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
                    <ul style="list-style: none; padding-left: 0;">
                        ${conflicts.map(c => {
                            // Replace course names with clickable links
                            let message = c.message;
                            if (c.course1 && c.course2) {
                                const course1Link = `<span class="conflict-course-link" onclick="planner.openCourseModal('${c.course1.id}')" style="color: ${c.course1.color}; font-weight: 600; cursor: pointer; text-decoration: underline;">"${c.course1.name}"</span>`;
                                const course2Link = `<span class="conflict-course-link" onclick="planner.openCourseModal('${c.course2.id}')" style="color: ${c.course2.color}; font-weight: 600; cursor: pointer; text-decoration: underline;">"${c.course2.name}"</span>`;
                                message = message.replace(`"${c.course1.name}"`, course1Link);
                                message = message.replace(`"${c.course2.name}"`, course2Link);
                            }
                            return `<li style="margin-bottom: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px;">${message}</li>`;
                        }).join('')}
                    </ul>
                </div>`
            }
        `;

        container.innerHTML = html;
    }

    generateUnavailableResourcesReport(container) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const coursesWithIssues = [];

        this.courses.forEach(course => {
            const issues = [];
            const courseDays = course.daysOfWeek || [course.dayOfWeek];

            // Check tutor availability on all days
            const tutorUnavailableDays = [];
            courseDays.forEach(day => {
                if (!this.checkTutorAvailability(course.tutorId, day, course.startTime, course.endTime)) {
                    tutorUnavailableDays.push(days[day]);
                }
            });
            if (tutorUnavailableDays.length > 0) {
                issues.push(`Tutor "${this.getTutorName(course.tutorId)}" not available on ${tutorUnavailableDays.join(', ')}`);
            }

            // Check location availability on all days
            const locationUnavailableDays = [];
            courseDays.forEach(day => {
                if (!this.checkLocationAvailability(course.locationId, day, course.startTime, course.endTime)) {
                    locationUnavailableDays.push(days[day]);
                }
            });
            if (locationUnavailableDays.length > 0) {
                issues.push(`Location "${this.getLocationName(course.locationId)}" not available on ${locationUnavailableDays.join(', ')}`);
            }

            // Check room capacity
            if (course.studentCount && course.locationId && course.locationId !== 'none') {
                const location = this.locations.find(l => l.id === course.locationId);
                if (location && location.capacity && course.studentCount > location.capacity) {
                    issues.push(`Room capacity exceeded: ${course.studentCount} students in "${location.name}" (capacity: ${location.capacity})`);
                }
            }

            if (issues.length > 0) {
                coursesWithIssues.push({
                    course,
                    issues
                });
            }
        });

        let html = '<h3>Courses with Unavailable Resources</h3>';

        if (coursesWithIssues.length === 0) {
            html += '<p style="color: var(--success-color); font-size: 1.2rem;">All courses have available resources!</p>';
        } else {
            html += `
                <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--warning-color); margin-bottom: 1rem;">
                    <p><strong>${coursesWithIssues.length} course(s) scheduled with unavailable resources</strong></p>
                </div>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Course Name</th>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Weeks</th>
                            <th>Issues</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${coursesWithIssues.map(item => {
                            const courseDays = item.course.daysOfWeek || [item.course.dayOfWeek];
                            const daysList = courseDays.map(d => days[d]).join('/');
                            return `
                            <tr class="clickable-row" onclick="planner.openCourseModal('${item.course.id}')" style="cursor: pointer;">
                                <td style="border-left: 4px solid ${item.course.color}">${item.course.name}</td>
                                <td>${daysList}</td>
                                <td>${item.course.startTime} - ${item.course.endTime}</td>
                                <td>${item.course.startWeek}-${item.course.startWeek + item.course.duration - 1}</td>
                                <td style="color: var(--error-color);">${item.issues.join('; ')}</td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
            `;
        }

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
        let csv = 'Course Name,Tutor,Location,Day(s),Start Time,End Time,Start Week,Duration\n';

        this.courses.forEach(course => {
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const daysList = courseDays.map(d => days[d]).join('/');

            csv += `"${course.name}",`;
            csv += `"${this.getTutorName(course.tutorId)}",`;
            csv += `"${this.getLocationName(course.locationId)}",`;
            csv += `"${daysList}",`;
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

    exportForAI() {
        // Analyze all conflicts and issues
        const conflicts = this.detectAllConflicts();
        const unavailableResources = this.detectUnavailableResources();
        const qualificationIssues = this.detectQualificationIssues();

        // Build enhanced data structure
        const aiData = {
            tutors: this.tutors,
            locations: this.locations,
            courses: this.courses,
            week1StartDate: this.week1StartDate,
            metadata: {
                totalWeeks: 40,
                timeSlots: "09:00-17:00 (courses can span multiple hours)",
                daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                exportDate: new Date().toISOString()
            },
            issues: {
                conflicts: conflicts,
                unavailableResources: unavailableResources,
                qualificationIssues: qualificationIssues,
                summary: {
                    totalConflicts: conflicts.length,
                    totalUnavailableResources: unavailableResources.length,
                    totalQualificationIssues: qualificationIssues.length
                }
            }
        };

        // Generate AI prompt
        const prompt = this.generateAIPrompt(aiData);

        // Copy to clipboard
        const fullText = prompt + "\n\n```json\n" + JSON.stringify(aiData, null, 2) + "\n```";

        navigator.clipboard.writeText(fullText).then(() => {
            alert('✅ AI optimization request copied to clipboard!\n\nNext steps:\n1. Open Claude or ChatGPT\n2. Paste the copied text (Ctrl+V)\n3. The AI will analyze and fix all issues\n4. Copy the AI\'s entire response\n5. Click "📋 Paste JSON from AI" to import it back\n\nNo need to create a file - just paste directly!');
            this.closeModal('modal-export');
        }).catch(err => {
            alert('Could not copy to clipboard. Please try again or use the JSON export instead.');
            console.error('Clipboard error:', err);
        });
    }

    async autoOptimizeWithAI() {
        // Check if API key is set
        if (!this.settings.anthropicApiKey || this.settings.anthropicApiKey.trim() === '') {
            alert('❌ No API key found!\n\nPlease set your Anthropic API key in Dashboard > Settings first.\n\nGet your API key from: https://console.anthropic.com/');
            return;
        }

        // Show loading message
        const originalButtonText = document.getElementById('btn-auto-optimize-ai').textContent;
        document.getElementById('btn-auto-optimize-ai').textContent = '⏳ Optimizing with AI...';
        document.getElementById('btn-auto-optimize-ai').disabled = true;

        try {
            // Prepare the data (same as exportForAI)
            const conflicts = this.detectAllConflicts();
            const unavailableResources = this.detectUnavailableResources();
            const qualificationIssues = this.detectQualificationIssues();

            const aiData = {
                tutors: this.tutors,
                locations: this.locations,
                courses: this.courses,
                week1StartDate: this.week1StartDate,
                metadata: {
                    totalWeeks: 40,
                    timeSlots: "09:00-17:00 (courses can span multiple hours)",
                    daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    exportDate: new Date().toISOString()
                },
                issues: {
                    conflicts: conflicts,
                    unavailableResources: unavailableResources,
                    qualificationIssues: qualificationIssues,
                    summary: {
                        totalConflicts: conflicts.length,
                        totalUnavailableResources: unavailableResources.length,
                        totalQualificationIssues: qualificationIssues.length
                    }
                }
            };

            const prompt = this.generateAIPrompt(aiData);

            // Call Anthropic API
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.settings.anthropicApiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 8000,
                    messages: [{
                        role: 'user',
                        content: prompt + "\n\n```json\n" + JSON.stringify(aiData, null, 2) + "\n```"
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
            }

            const result = await response.json();
            const aiResponse = result.content[0].text;

            // Extract JSON from AI response
            const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (!jsonMatch) {
                throw new Error('Could not find JSON in AI response');
            }

            const optimizedData = JSON.parse(jsonMatch[1].trim());

            // Show preview and import
            this.closeModal('modal-export');
            this.showImportPreview(optimizedData);

            alert('✅ AI optimization complete!\n\nReview the changes in the preview and click "Apply Import" to use the optimized schedule.');

        } catch (error) {
            console.error('AI optimization error:', error);

            let errorMsg = error.message;
            if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
                errorMsg = 'Browser security (CORS) prevents direct API calls.\n\nThe Anthropic API cannot be called directly from browsers.\n\nPlease use the "Manual: Export for AI" option instead:\n1. Click "Manual: Export for AI"\n2. Paste into Claude at claude.ai\n3. Copy the response\n4. Click "Paste JSON from AI"';
            }

            alert(`❌ AI optimization failed:\n\n${errorMsg}\n\nNote: Direct API calls require a backend server.\nThe manual workflow is recommended for browser-based usage.`);
        } finally {
            // Restore button
            document.getElementById('btn-auto-optimize-ai').textContent = originalButtonText;
            document.getElementById('btn-auto-optimize-ai').disabled = false;
        }
    }

    detectUnavailableResources() {
        const issues = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        this.courses.forEach(course => {
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const courseIssues = [];

            // Check tutor availability on all days
            if (course.tutorId && course.tutorId !== 'none') {
                const tutorUnavailableDays = [];
                courseDays.forEach(day => {
                    if (!this.checkTutorAvailability(course.tutorId, day, course.startTime, course.endTime)) {
                        tutorUnavailableDays.push(days[day]);
                    }
                });
                if (tutorUnavailableDays.length > 0) {
                    courseIssues.push(`Tutor "${this.getTutorName(course.tutorId)}" not available on ${tutorUnavailableDays.join(', ')}`);
                }
            }

            // Check location availability on all days
            if (course.locationId && course.locationId !== 'none') {
                const locationUnavailableDays = [];
                courseDays.forEach(day => {
                    if (!this.checkLocationAvailability(course.locationId, day, course.startTime, course.endTime)) {
                        locationUnavailableDays.push(days[day]);
                    }
                });
                if (locationUnavailableDays.length > 0) {
                    courseIssues.push(`Location "${this.getLocationName(course.locationId)}" not available on ${locationUnavailableDays.join(', ')}`);
                }
            }

            if (courseIssues.length > 0) {
                issues.push({
                    courseId: course.id,
                    courseName: course.name,
                    issues: courseIssues
                });
            }
        });

        return issues;
    }

    detectQualificationIssues() {
        const issues = [];

        this.courses.forEach(course => {
            if (course.tutorId && course.tutorId !== 'none') {
                const qualifiedTutors = course.qualifiedTutors || [];

                // Check if assigned tutor is qualified
                if (qualifiedTutors.length > 0 && !qualifiedTutors.includes(course.tutorId)) {
                    issues.push({
                        courseId: course.id,
                        courseName: course.name,
                        issue: `Tutor "${this.getTutorName(course.tutorId)}" is NOT qualified to teach this course`,
                        qualifiedTutorIds: qualifiedTutors
                    });
                }
            }
        });

        return issues;
    }

    generateAIPrompt(data) {
        const { issues } = data;

        return `I have a course scheduling system for an adult learning center with ${data.courses.length} courses, ${data.tutors.length} tutors, and ${data.locations.length} locations.

I need you to analyze the JSON data below and automatically fix ALL scheduling issues while respecting all constraints.

## Current Issues:
- **${issues.summary.totalConflicts} conflicts** (tutor/location double-bookings)
- **${issues.summary.totalUnavailableResources} availability issues** (resources not available at scheduled times)
- **${issues.summary.totalQualificationIssues} qualification issues** (tutors assigned to courses they're not qualified to teach)

## Data Structure:

**Tutors:**
- \`id\`: unique identifier
- \`name\`, \`email\`, \`phone\`, \`skills\`: contact info
- \`canTeach\`: array of course IDs this tutor is qualified to teach
- \`recurringAvailability\`: object mapping day numbers (0=Sun, 1=Mon, etc.) to time periods ["morning", "afternoon", "evening"]
  - morning: 09:00-12:00, afternoon: 12:00-17:00, evening: 17:00-21:00
- \`customAvailability\`: array of specific date/time exceptions

**Locations:**
- \`id\`: unique identifier
- \`name\`, \`capacity\`, \`facilities\`: location info
- \`recurringAvailability\`: same format as tutors

**Courses:**
- \`id\`: unique identifier
- \`name\`, \`color\`, \`funded\`, \`notes\`: course info
- \`tutorId\`: assigned tutor (can be "none" if not yet assigned)
- \`locationId\`: assigned location (can be "none" if not yet assigned)
- \`qualifiedTutors\`: array of tutor IDs who CAN teach this course
- \`daysOfWeek\`: array of day numbers when course runs (0=Sun, 1=Mon, etc.)
- \`startTime\`, \`endTime\`: time in HH:MM format (24-hour)
- \`startWeek\`: which week course starts (1-40)
- \`duration\`: how many weeks course runs

## Requirements:

1. **Fix all conflicts**: No tutor or location can be double-booked
2. **Respect availability**: Only assign tutors/locations when they're marked as available
3. **Respect qualifications**: Only assign tutors from the course's \`qualifiedTutors\` list
4. **Preserve when possible**:
   - Keep course times and days the same if possible
   - Only change tutor/location assignments when necessary
   - If changing times, stay within resource availability

## Your Task:

1. Analyze all the issues listed above
2. Make minimal changes to fix all conflicts
3. Ensure all tutors and locations are available when scheduled
4. Ensure all assigned tutors are qualified (\`tutorId\` must be in \`qualifiedTutors\` array)
5. Return the COMPLETE corrected JSON with all tutors, locations, and courses

## Output Format:

Return ONLY the corrected JSON in a code block, with no additional explanation. Make sure to include ALL fields, not just the ones you changed.

Here is the data to optimize:`;
    }

    openPasteJsonModal() {
        document.getElementById('paste-json-input').value = '';
        this.closeModal('modal-export');
        this.openModal('modal-paste-json');
    }

    processPastedJSON() {
        const pastedText = document.getElementById('paste-json-input').value.trim();

        if (!pastedText) {
            alert('Please paste some JSON data first.');
            return;
        }

        try {
            // Try to extract JSON from code blocks if present
            let jsonText = pastedText;

            // Check if text contains markdown code block
            const codeBlockMatch = pastedText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                jsonText = codeBlockMatch[1].trim();
            }

            // Debug: Show what we're trying to parse
            console.log('Attempting to parse JSON...');
            console.log('First 200 chars:', jsonText.substring(0, 200));
            console.log('Last 100 chars:', jsonText.substring(jsonText.length - 100));
            console.log('Text length:', jsonText.length);

            // Check for common issues
            if (jsonText.startsWith('```') || jsonText.endsWith('```')) {
                alert('⚠️ Detected markdown code blocks that weren\'t stripped.\n\nPlease copy ONLY the JSON content (without the ``` markers).');
                return;
            }

            // Parse the JSON
            const data = JSON.parse(jsonText);

            // Validate the imported data
            if (!data.tutors || !data.locations || !data.courses) {
                alert('Invalid data format. The JSON must contain tutors, locations, and courses.');
                return;
            }

            // Close paste modal and show preview
            this.closeModal('modal-paste-json');
            this.showImportPreview(data);

        } catch (error) {
            console.error('Parse error:', error);
            console.error('Pasted text:', pastedText);

            let helpText = '\n\nTips:\n';
            helpText += '- Make sure you copied the ENTIRE JSON (from { to })\n';
            helpText += '- Remove any extra text before or after the JSON\n';
            helpText += '- Don\'t include markdown code blocks (```)\n';
            helpText += '- Check the browser console (F12) for more details';

            alert('Error parsing JSON: ' + error.message + helpText);
        }
    }

    importFromJSON() {
        const input = document.getElementById('input-import-json');
        const file = input.files[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonText = e.target.result.trim();

                // Show first 100 characters for debugging
                console.log('First 100 chars of file:', jsonText.substring(0, 100));

                const data = JSON.parse(jsonText);

                // Validate the imported data
                if (!data.tutors || !data.locations || !data.courses) {
                    alert('Invalid data format. The JSON must contain tutors, locations, and courses.');
                    return;
                }

                // Show preview/comparison
                this.showImportPreview(data);

            } catch (error) {
                const errorMsg = 'Error parsing JSON: ' + error.message + '\n\nMake sure you pasted valid JSON data.';
                alert(errorMsg);
                console.error('JSON parse error:', error);
                console.error('File content length:', e.target.result.length);
            }
        };

        reader.readAsText(file);

        // Reset the input so the same file can be selected again
        input.value = '';
    }

    showImportPreview(newData) {
        // Calculate differences
        const diff = this.calculateImportDiff(newData);

        // Show confirmation with summary
        const message = `Import Summary:

Tutors: ${this.tutors.length} → ${newData.tutors.length} (${diff.tutors.added} added, ${diff.tutors.removed} removed, ${diff.tutors.modified} modified)
Locations: ${this.locations.length} → ${newData.locations.length} (${diff.locations.added} added, ${diff.locations.removed} removed, ${diff.locations.modified} modified)
Courses: ${this.courses.length} → ${newData.courses.length} (${diff.courses.added} added, ${diff.courses.removed} removed, ${diff.courses.modified} modified)

This will replace all current data. Are you sure?`;

        if (confirm(message)) {
            // Create backup before importing
            this.createBackup();

            // Apply the import
            this.tutors = newData.tutors || [];
            this.locations = newData.locations || [];
            this.courses = newData.courses || [];
            if (newData.week1StartDate) {
                this.week1StartDate = newData.week1StartDate;
                document.getElementById('week1-start-date').value = newData.week1StartDate;
            }

            this.saveData();

            alert('✅ Data imported successfully!\n\nA backup of your previous data has been saved.\nUse "Undo Last Import" if you need to restore it.');
            this.closeModal('modal-export');
            this.switchView('dashboard');
        }
    }

    calculateImportDiff(newData) {
        const diff = {
            tutors: { added: 0, removed: 0, modified: 0 },
            locations: { added: 0, removed: 0, modified: 0 },
            courses: { added: 0, removed: 0, modified: 0 }
        };

        // Calculate tutor changes
        const currentTutorIds = new Set(this.tutors.map(t => t.id));
        const newTutorIds = new Set(newData.tutors.map(t => t.id));

        newData.tutors.forEach(newTutor => {
            if (!currentTutorIds.has(newTutor.id)) {
                diff.tutors.added++;
            } else {
                const currentTutor = this.tutors.find(t => t.id === newTutor.id);
                if (JSON.stringify(currentTutor) !== JSON.stringify(newTutor)) {
                    diff.tutors.modified++;
                }
            }
        });
        this.tutors.forEach(tutor => {
            if (!newTutorIds.has(tutor.id)) {
                diff.tutors.removed++;
            }
        });

        // Calculate location changes
        const currentLocationIds = new Set(this.locations.map(l => l.id));
        const newLocationIds = new Set(newData.locations.map(l => l.id));

        newData.locations.forEach(newLocation => {
            if (!currentLocationIds.has(newLocation.id)) {
                diff.locations.added++;
            } else {
                const currentLocation = this.locations.find(l => l.id === newLocation.id);
                if (JSON.stringify(currentLocation) !== JSON.stringify(newLocation)) {
                    diff.locations.modified++;
                }
            }
        });
        this.locations.forEach(location => {
            if (!newLocationIds.has(location.id)) {
                diff.locations.removed++;
            }
        });

        // Calculate course changes
        const currentCourseIds = new Set(this.courses.map(c => c.id));
        const newCourseIds = new Set(newData.courses.map(c => c.id));

        newData.courses.forEach(newCourse => {
            if (!currentCourseIds.has(newCourse.id)) {
                diff.courses.added++;
            } else {
                const currentCourse = this.courses.find(c => c.id === newCourse.id);
                if (JSON.stringify(currentCourse) !== JSON.stringify(newCourse)) {
                    diff.courses.modified++;
                }
            }
        });
        this.courses.forEach(course => {
            if (!newCourseIds.has(course.id)) {
                diff.courses.removed++;
            }
        });

        return diff;
    }

    createBackup() {
        const backup = {
            tutors: JSON.parse(JSON.stringify(this.tutors)),
            locations: JSON.parse(JSON.stringify(this.locations)),
            courses: JSON.parse(JSON.stringify(this.courses)),
            week1StartDate: this.week1StartDate,
            backupDate: new Date().toISOString()
        };

        localStorage.setItem('coursePlannerBackup', JSON.stringify(backup));
        console.log('Backup created:', backup.backupDate);
    }

    restoreBackup() {
        const backupData = localStorage.getItem('coursePlannerBackup');

        if (!backupData) {
            alert('No backup found. Import a file first to create a backup.');
            return;
        }

        const backup = JSON.parse(backupData);

        if (confirm(`Restore backup from ${new Date(backup.backupDate).toLocaleString()}?\n\nThis will undo your last import.`)) {
            this.tutors = backup.tutors;
            this.locations = backup.locations;
            this.courses = backup.courses;
            this.week1StartDate = backup.week1StartDate;
            if (this.week1StartDate) {
                document.getElementById('week1-start-date').value = this.week1StartDate;
            }

            this.saveData();

            alert('✅ Backup restored successfully!');
            this.switchView('dashboard');
        }
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
