// Course Planner Application
// Data Models and State Management

class CoursePlanner {
    constructor() {
        this.tutors = [];
        this.locations = [];
        this.courses = [];
        this.unavailableDates = [];  // Store dates when courses cannot be scheduled
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
            this.unavailableDates = data.unavailableDates || [];
            this.week1StartDate = data.week1StartDate || null;
            this.settings = data.settings || {
                fundedCourseColor: '#4CAF50',
                nonFundedCourseColor: '#2196F3'
            };

            // Migrate old data if needed
            this.migrateOldAvailabilityData();
        }

        // Update the UI and validate Week 1 Start Date
        if (this.week1StartDate) {
            // Ensure week1StartDate is a Monday
            const weekStartDate = new Date(this.week1StartDate);
            const dayOfWeek = weekStartDate.getDay();

            if (dayOfWeek !== 1) {
                // Adjust to previous Monday
                const daysToSubtract = (dayOfWeek === 0) ? 6 : (dayOfWeek - 1);
                weekStartDate.setDate(weekStartDate.getDate() - daysToSubtract);
                this.week1StartDate = weekStartDate.toISOString().split('T')[0];
                this.saveData();
                console.warn('Week 1 Start Date was not a Monday. Auto-corrected to:', this.week1StartDate);
            }

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

            // Initialize travelTimes if it doesn't exist
            if (!location.travelTimes) {
                location.travelTimes = {};
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
            unavailableDates: this.unavailableDates,
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
            case 'unavailable':
                this.renderUnavailableDates();
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
                // Regenerate the current report to show latest data
                this.generateReport();
                break;
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('btn-dashboard').addEventListener('click', () => this.switchView('dashboard'));
        document.getElementById('btn-unavailable').addEventListener('click', () => this.switchView('unavailable'));
        document.getElementById('btn-tutors').addEventListener('click', () => this.switchView('tutors'));
        document.getElementById('btn-locations').addEventListener('click', () => this.switchView('locations'));
        document.getElementById('btn-courses').addEventListener('click', () => this.switchView('courses'));
        document.getElementById('btn-reports').addEventListener('click', () => this.switchView('reports'));
        document.getElementById('btn-export').addEventListener('click', () => this.openModal('modal-export'));

        // Unavailable Dates
        document.getElementById('btn-add-unavailable-date').addEventListener('click', () => this.openUnavailableDateModal());
        document.getElementById('form-unavailable-date').addEventListener('submit', (e) => this.saveUnavailableDate(e));

        // Toggle between single date and date range
        document.querySelectorAll('input[name="date-type"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isSingle = e.target.value === 'single';
                document.getElementById('single-date-group').style.display = isSingle ? 'block' : 'none';
                document.getElementById('date-range-group').style.display = isSingle ? 'none' : 'block';

                // Update required attributes
                document.getElementById('unavailable-date').required = isSingle;
                document.getElementById('unavailable-start-date').required = !isSingle;
                document.getElementById('unavailable-end-date').required = !isSingle;
            });
        });

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

        // Auto-calculate end time based on start time and duration
        document.getElementById('course-start-time').addEventListener('change', () => {
            this.calculateEndTime();
        });
        document.getElementById('course-duration-hours').addEventListener('input', () => {
            this.calculateEndTime();
        });

        // Settings
        document.getElementById('week1-start-date').addEventListener('change', (e) => {
            const selectedDate = new Date(e.target.value);
            const dayOfWeek = selectedDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

            // Check if selected date is a Monday
            if (dayOfWeek !== 1) {
                // Find the nearest Monday (go backwards to previous Monday)
                const daysToSubtract = (dayOfWeek === 0) ? 6 : (dayOfWeek - 1);
                selectedDate.setDate(selectedDate.getDate() - daysToSubtract);

                const adjustedDateString = selectedDate.toISOString().split('T')[0];
                document.getElementById('week1-start-date').value = adjustedDateString;

                alert(`Week 1 Start Date must be a Monday. Adjusted to ${this.formatDate(selectedDate)}`);
                this.week1StartDate = adjustedDateString;
            } else {
                this.week1StartDate = e.target.value;
            }

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
                            ${hasAvailabilityIssue ? '<span class="conflict-indicator">!</span> ' : ''}${course.name} | ${course.code || 'No code'}
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
                            const checkbox = document.querySelector(`#tutor-recurring-availability input[data-day="${day}"][data-period="${slot}"]`);
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

        // Focus on tutor name field to bring modal to top
        setTimeout(() => {
            document.getElementById('tutor-name').focus();
        }, 150);
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
        // Removed Saturday and Sunday as they are not used
        const days = [
            { name: 'Mon', value: 1 },
            { name: 'Tue', value: 2 },
            { name: 'Wed', value: 3 },
            { name: 'Thu', value: 4 },
            { name: 'Fri', value: 5 }
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
                this.populateTravelTimesForm(locationId);
            }
        } else {
            document.getElementById('location-modal-title').textContent = 'Add Location';
            document.getElementById('location-id').value = ''; // Explicitly clear ID for new location
            this.renderCustomAvailability('location', []);
            this.populateTravelTimesForm(null);
        }

        this.openModal('modal-location');

        // Focus on location name field to bring modal to top
        setTimeout(() => {
            document.getElementById('location-name').focus();
        }, 150);
    }

    populateTravelTimesForm(currentLocationId) {
        const container = document.getElementById('location-travel-times-container');

        // Get all locations except the current one being edited
        const otherLocations = this.locations.filter(loc => loc.id !== currentLocationId);

        if (otherLocations.length === 0) {
            container.innerHTML = '<div class="travel-times-empty">No other locations exist yet. Travel times will appear here when you add more locations.</div>';
            return;
        }

        const currentLocation = currentLocationId ? this.locations.find(l => l.id === currentLocationId) : null;
        const existingTravelTimes = currentLocation?.travelTimes || {};

        container.innerHTML = otherLocations.map(location => {
            const travelTime = existingTravelTimes[location.id] || '';
            return `
                <div class="travel-time-row">
                    <label for="travel-time-${location.id}">To ${location.name}:</label>
                    <input
                        type="number"
                        id="travel-time-${location.id}"
                        data-location-id="${location.id}"
                        class="travel-time-input"
                        min="0"
                        step="5"
                        value="${travelTime}"
                        placeholder="0"
                        ${otherLocations.length > 0 ? 'required' : ''}
                    />
                </div>
            `;
        }).join('');
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

        // Collect travel times
        const travelTimes = {};
        const travelTimeInputs = document.querySelectorAll('.travel-time-input');

        // Validate that all travel times are filled if there are other locations
        if (travelTimeInputs.length > 0) {
            let hasEmptyTravelTimes = false;
            travelTimeInputs.forEach(input => {
                const value = input.value.trim();
                if (value === '') {
                    hasEmptyTravelTimes = true;
                    input.style.borderColor = 'red';
                } else {
                    input.style.borderColor = '';
                    const otherLocationId = input.getAttribute('data-location-id');
                    travelTimes[otherLocationId] = parseInt(value);
                }
            });

            if (hasEmptyTravelTimes) {
                alert('Please fill in all travel times to other locations. This is required to prevent scheduling conflicts.');
                return;
            }
        }

        const location = {
            id: locationId,
            name,
            capacity: capacity ? parseInt(capacity) : null,
            facilities,
            recurringAvailability,
            customAvailability,
            travelTimes
        };

        const existingIndex = this.locations.findIndex(l => l.id === locationId);
        if (existingIndex >= 0) {
            this.locations[existingIndex] = location;
        } else {
            this.locations.push(location);
        }

        // Update reverse travel times for other locations
        Object.keys(travelTimes).forEach(otherLocationId => {
            const otherLocation = this.locations.find(l => l.id === otherLocationId);
            if (otherLocation) {
                if (!otherLocation.travelTimes) {
                    otherLocation.travelTimes = {};
                }
                // Set the reverse travel time (can be asymmetric but defaults to same value)
                if (!otherLocation.travelTimes[locationId]) {
                    otherLocation.travelTimes[locationId] = travelTimes[otherLocationId];
                }
            }
        });

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

    // Unavailable Dates Management
    openUnavailableDateModal(dateId = null) {
        this.editingId = dateId;
        const modal = document.getElementById('modal-unavailable-date');
        const title = document.getElementById('unavailable-date-modal-title');
        const form = document.getElementById('form-unavailable-date');

        form.reset();
        document.getElementById('single-date-group').style.display = 'block';
        document.getElementById('date-range-group').style.display = 'none';
        document.getElementById('unavailable-date').required = true;
        document.getElementById('unavailable-start-date').required = false;
        document.getElementById('unavailable-end-date').required = false;

        if (dateId) {
            title.textContent = 'Edit Unavailable Date';
            const dateEntry = this.unavailableDates.find(d => d.id === dateId);
            if (dateEntry) {
                document.getElementById('unavailable-date-id').value = dateEntry.id;
                document.getElementById('unavailable-reason').value = dateEntry.reason;

                if (dateEntry.type === 'range') {
                    document.querySelector('input[name="date-type"][value="range"]').checked = true;
                    document.getElementById('single-date-group').style.display = 'none';
                    document.getElementById('date-range-group').style.display = 'block';
                    document.getElementById('unavailable-date').required = false;
                    document.getElementById('unavailable-start-date').required = true;
                    document.getElementById('unavailable-end-date').required = true;
                    document.getElementById('unavailable-start-date').value = dateEntry.startDate;
                    document.getElementById('unavailable-end-date').value = dateEntry.endDate;
                } else {
                    document.getElementById('unavailable-date').value = dateEntry.date;
                }
            }
        } else {
            title.textContent = 'Add Unavailable Date';
        }

        this.openModal('modal-unavailable-date');
    }

    saveUnavailableDate(e) {
        e.preventDefault();

        const dateType = document.querySelector('input[name="date-type"]:checked').value;
        const reason = document.getElementById('unavailable-reason').value;
        const id = document.getElementById('unavailable-date-id').value || Date.now().toString();

        let dateEntry;

        if (dateType === 'single') {
            const date = document.getElementById('unavailable-date').value;
            if (!date) {
                alert('Please select a date');
                return;
            }
            dateEntry = {
                id,
                type: 'single',
                date,
                reason
            };
        } else {
            const startDate = document.getElementById('unavailable-start-date').value;
            const endDate = document.getElementById('unavailable-end-date').value;

            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                alert('End date must be after start date');
                return;
            }

            dateEntry = {
                id,
                type: 'range',
                startDate,
                endDate,
                reason
            };
        }

        if (this.editingId) {
            const index = this.unavailableDates.findIndex(d => d.id === this.editingId);
            if (index !== -1) {
                this.unavailableDates[index] = dateEntry;
            }
        } else {
            this.unavailableDates.push(dateEntry);
        }

        console.log('Saving unavailable date:', dateEntry);
        console.log('Total unavailable dates:', this.unavailableDates.length);

        this.saveData();
        this.closeModal('modal-unavailable-date');
        this.renderUnavailableDates();
        if (this.currentView === 'courses') {
            this.renderCalendar();
        }
    }

    renderUnavailableDates() {
        const grid = document.getElementById('unavailable-dates-grid');
        console.log('Rendering unavailable dates view. Count:', this.unavailableDates.length);

        if (this.unavailableDates.length === 0) {
            grid.innerHTML = '<p style="color: var(--gray-600); padding: 2rem; text-align: center;">No unavailable dates set. Click "Add Unavailable Date" to mark dates when courses cannot be scheduled.</p>';
            return;
        }

        // Sort by date
        const sortedDates = [...this.unavailableDates].sort((a, b) => {
            const dateA = new Date(a.type === 'single' ? a.date : a.startDate);
            const dateB = new Date(b.type === 'single' ? b.date : b.startDate);
            return dateA - dateB;
        });

        grid.innerHTML = sortedDates.map(dateEntry => {
            let dateDisplay;
            let daysCount = 1;

            if (dateEntry.type === 'range') {
                const startDate = new Date(dateEntry.startDate);
                const endDate = new Date(dateEntry.endDate);
                daysCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                dateDisplay = `${this.formatDate(startDate)} to ${this.formatDate(endDate)}`;
            } else {
                dateDisplay = this.formatDate(new Date(dateEntry.date));
            }

            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${dateEntry.reason}</h3>
                        <div class="card-actions">
                            <button class="btn btn-sm btn-secondary" onclick="planner.openUnavailableDateModal('${dateEntry.id}')">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="planner.deleteUnavailableDate('${dateEntry.id}')">Delete</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div><strong>Date:</strong> ${dateDisplay}</div>
                        <div><strong>Duration:</strong> ${daysCount} day${daysCount > 1 ? 's' : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    deleteUnavailableDate(dateId) {
        if (confirm('Are you sure you want to delete this unavailable date?')) {
            this.unavailableDates = this.unavailableDates.filter(d => d.id !== dateId);
            this.saveData();
            this.renderUnavailableDates();
            if (this.currentView === 'courses') {
                this.renderCalendar();
            }
        }
    }

    isDateUnavailable(dateString) {
        const checkDate = new Date(dateString);
        checkDate.setHours(0, 0, 0, 0);

        return this.unavailableDates.some(entry => {
            if (entry.type === 'single') {
                const unavailableDate = new Date(entry.date);
                unavailableDate.setHours(0, 0, 0, 0);
                return checkDate.getTime() === unavailableDate.getTime();
            } else {
                const startDate = new Date(entry.startDate);
                const endDate = new Date(entry.endDate);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                return checkDate >= startDate && checkDate <= endDate;
            }
        });
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

        // Show/hide amendment reason based on whether editing or creating
        const amendmentReasonGroup = document.getElementById('amendment-reason-group');
        const amendmentReasonSelect = document.getElementById('amendment-reason');

        if (courseId) {
            // Editing existing course - show amendment reason dropdown
            amendmentReasonGroup.style.display = 'block';
            amendmentReasonSelect.required = true;

            const course = this.courses.find(c => c.id === courseId);
            if (course) {
                document.getElementById('course-modal-title').textContent = 'Edit Course';
                document.getElementById('course-id').value = course.id;
                document.getElementById('course-name').value = course.name;
                document.getElementById('course-code').value = course.code || '';
                document.getElementById('course-color').value = course.color;
                this.updateColorPreview(course.color);
                document.getElementById('course-funded').checked = course.funded || false;

                // Populate week dropdown with dates
                this.populateWeekDropdown(course.startWeek);
                document.getElementById('course-duration').value = course.duration;

                // Set day checkboxes (handle both old and new format)
                const courseDays = course.daysOfWeek || [course.dayOfWeek];
                document.querySelectorAll('input[name="course-day"]').forEach(checkbox => {
                    checkbox.checked = courseDays.includes(parseInt(checkbox.value));
                });

                document.getElementById('course-start-time').value = course.startTime;
                document.getElementById('course-end-time').value = course.endTime;

                // Calculate duration in hours from start and end times
                if (course.startTime && course.endTime) {
                    const [startHours, startMins] = course.startTime.split(':').map(Number);
                    const [endHours, endMins] = course.endTime.split(':').map(Number);
                    const startMinutes = startHours * 60 + startMins;
                    const endMinutes = endHours * 60 + endMins;
                    const durationMinutes = endMinutes - startMinutes;
                    const durationHours = durationMinutes / 60;
                    document.getElementById('course-duration-hours').value = durationHours;
                }

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

            // Populate week dropdown (defaults to week 1)
            this.populateWeekDropdown(1);

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

            // Creating new course - hide amendment reason dropdown
            amendmentReasonGroup.style.display = 'none';
            amendmentReasonSelect.required = false;
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

    calculateEndTime() {
        const startTime = document.getElementById('course-start-time').value;
        const durationHours = parseFloat(document.getElementById('course-duration-hours').value);

        if (!startTime || !durationHours) {
            return;
        }

        // Parse start time
        const [hours, minutes] = startTime.split(':').map(Number);

        // Calculate end time
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (durationHours * 60);

        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;

        // Format as HH:MM
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

        document.getElementById('course-end-time').value = endTime;
    }

    populateWeekDropdown(selectedWeek = null) {
        const weekSelect = document.getElementById('course-start-week');
        let html = '';

        for (let week = 1; week <= 40; week++) {
            let label = `Week ${week}`;

            // If week 1 start date is set, calculate and show the date
            if (this.week1StartDate) {
                const weekStartDate = new Date(this.week1StartDate);
                weekStartDate.setDate(weekStartDate.getDate() + (week - 1) * 7);
                const dateStr = weekStartDate.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                });
                label = `Week ${week} (${dateStr})`;
            }

            html += `<option value="${week}">${label}</option>`;
        }

        weekSelect.innerHTML = html;

        // Set selected value if provided
        if (selectedWeek) {
            weekSelect.value = selectedWeek;
        }
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

                // Check travel time conflicts
                const locationId = document.getElementById('course-location').value;
                if (locationId && locationId !== 'none') {
                    const tempCourse = {
                        id: courseId || 'temp',
                        tutorId: tutor.id,
                        locationId: locationId,
                        daysOfWeek: daysOfWeek,
                        startTime: startTime,
                        endTime: endTime,
                        startWeek: startWeek,
                        duration: duration
                    };
                    const travelConflicts = this.checkTutorTravelConflicts(tempCourse);
                    if (travelConflicts.length > 0) {
                        status.push('Travel Conflict');
                        statusEmoji = '🔴';
                    }
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
        const code = document.getElementById('course-code').value || 'No code';
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
            code,
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
        }; console.log(course);

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

        // Check if course falls on any unavailable dates
        const unavailableDateConflicts = [];
        for (let week = startWeek; week < startWeek + duration; week++) {
            const weekStart = this.getWeekStartDate(week);
            if (!weekStart) continue;

            daysOfWeek.forEach(dayOfWeek => {
                const courseDate = new Date(weekStart);
                // weekStart is guaranteed to be Monday (day 1)
                // dayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
                // For Sunday (0), we need to add 6 days to get to the Sunday of that week
                const daysOffset = dayOfWeek === 0 ? 6 : (dayOfWeek - 1);
                courseDate.setDate(courseDate.getDate() + daysOffset);
                const courseDateString = courseDate.toISOString().split('T')[0];

                if (this.isDateUnavailable(courseDateString)) {
                    const unavailableEntry = this.unavailableDates.find(entry => {
                        if (entry.type === 'single') {
                            return entry.date === courseDateString;
                        } else {
                            const checkDate = new Date(courseDateString);
                            const startDate = new Date(entry.startDate);
                            const endDate = new Date(entry.endDate);
                            return checkDate >= startDate && checkDate <= endDate;
                        }
                    });

                    const reason = unavailableEntry ? unavailableEntry.reason : 'Unknown reason';
                    unavailableDateConflicts.push({
                        date: this.formatDate(courseDate),
                        day: days[dayOfWeek],
                        week: week,
                        reason: reason
                    });
                }
            });
        }

        if (unavailableDateConflicts.length > 0) {
            const conflictList = unavailableDateConflicts
                .map(c => `- Week ${c.week}, ${c.day} (${c.date}): ${c.reason}`)
                .join('\n');
            alert(`ERROR: This course cannot be scheduled because it falls on unavailable dates:\n\n${conflictList}\n\nPlease adjust the course schedule or remove the unavailable dates.`);
            return;
        }

        // Check for double-booking conflicts on all days
        const conflicts = this.checkCourseConflicts(course);

        // Separate travel conflicts from other conflicts
        const travelConflicts = conflicts.filter(c => c.type === 'travel');
        const otherConflicts = conflicts.filter(c => c.type !== 'travel');

        // Travel conflicts are BLOCKING - cannot proceed
        if (travelConflicts.length > 0) {
            const conflictMessages = travelConflicts.map(c => `- ${c.message}`).join('\n\n');
            alert(`ERROR: This course cannot be scheduled due to travel time restrictions:\n\n${conflictMessages}\n\nPlease adjust the course schedule or location to allow sufficient travel time between locations.`);
            return;
        }

        // Other conflicts are warnings - can override
        if (otherConflicts.length > 0) {
            const conflictMessages = otherConflicts.map(c => `- ${c.message}`).join('\n');
            if (!confirm(`WARNING: This course creates the following conflicts:\n\n${conflictMessages}\n\nDo you want to schedule this course anyway?`)) {
                return;
            }
        }

        const existingIndex = this.courses.findIndex(c => c.id === courseId);
        if (existingIndex >= 0) {
            // Editing existing course - record amendment
            const amendmentReason = document.getElementById('amendment-reason').value;

            if (!amendmentReason) {
                alert('Please select a reason for the amendment');
                return;
            }

            const existingCourse = this.courses[existingIndex];

            // Initialize amendments array if it doesn't exist
            if (!course.amendments) {
                course.amendments = existingCourse.amendments || [];
            }

            // Create amendment record
            const amendment = {
                timestamp: new Date().toISOString(),
                reason: amendmentReason,
                changes: this.detectCourseChanges(existingCourse, course)
            };

            course.amendments.push(amendment);
            this.courses[existingIndex] = course;
        } else {
            // New course - no amendments needed
            course.amendments = [];
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

    detectCourseChanges(oldCourse, newCourse) {
        const changes = [];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        if (oldCourse.name !== newCourse.name) {
            changes.push(`Name: "${oldCourse.name}" → "${newCourse.name}"`);
        }
        if (oldCourse.code !== newCourse.code) {
            changes.push(`Code: "${oldCourse.code}" → "${newCourse.code}"`);
        }
        if (oldCourse.tutorId !== newCourse.tutorId) {
            const oldTutor = this.getTutorName(oldCourse.tutorId);
            const newTutor = this.getTutorName(newCourse.tutorId);
            changes.push(`Tutor: ${oldTutor} → ${newTutor}`);
        }
        if (oldCourse.locationId !== newCourse.locationId) {
            const oldLocation = this.getLocationName(oldCourse.locationId);
            const newLocation = this.getLocationName(newCourse.locationId);
            changes.push(`Location: ${oldLocation} → ${newLocation}`);
        }
        if (oldCourse.startWeek !== newCourse.startWeek) {
            changes.push(`Start Week: ${oldCourse.startWeek} → ${newCourse.startWeek}`);
        }
        if (oldCourse.duration !== newCourse.duration) {
            changes.push(`Duration: ${oldCourse.duration} weeks → ${newCourse.duration} weeks`);
        }

        // Compare days of week
        const oldDays = JSON.stringify((oldCourse.daysOfWeek || [oldCourse.dayOfWeek]).sort());
        const newDays = JSON.stringify(newCourse.daysOfWeek.sort());
        if (oldDays !== newDays) {
            const oldDayNames = (oldCourse.daysOfWeek || [oldCourse.dayOfWeek]).map(d => days[d]).join(', ');
            const newDayNames = newCourse.daysOfWeek.map(d => days[d]).join(', ');
            changes.push(`Days: ${oldDayNames} → ${newDayNames}`);
        }

        if (oldCourse.startTime !== newCourse.startTime) {
            changes.push(`Start Time: ${oldCourse.startTime} → ${newCourse.startTime}`);
        }
        if (oldCourse.endTime !== newCourse.endTime) {
            changes.push(`End Time: ${oldCourse.endTime} → ${newCourse.endTime}`);
        }
        if (oldCourse.funded !== newCourse.funded) {
            changes.push(`Funding: ${oldCourse.funded ? 'Funded' : 'Non-funded'} → ${newCourse.funded ? 'Funded' : 'Non-funded'}`);
        }

        return changes;
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
            course.name.toLowerCase().includes(term) || 
            (course.code && course.code.toLowerCase().includes(term))
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
            const courseCode = block.querySelector('.course-code')?.textContent.toLowerCase() || '';

            if (courseName.includes(term) || courseDetails.includes(term) || courseCode.includes(term)) {
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

        const days = ['Time', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        const timeSlots = this.generateTimeSlots();

        // Set grid columns dynamically based on number of weeks (1 time column + 5 days × weeks)
        // Use auto instead of 1fr to allow cells to grow based on their min-width
        const totalColumns = 1 + (5 * weeksToShow);
        container.style.gridTemplateColumns = `80px repeat(${5 * weeksToShow}, auto)`;

        // Header row with weeks
        let html = '<div class="calendar-header">Time</div>';
        for (let week = startWeek; week <= endWeek; week++) {
            const weekStart = this.getWeekStartDate(week);
            const weekStartFormatted = weekStart ? ` (w/b ${this.formatDate(weekStart)})` : '';
            html += `<div class="calendar-header calendar-week-header" style="grid-column: span 5;">Week ${week}${weekStartFormatted}</div>`;
        }

        // Day headers for each week
        html += '<div class="calendar-header"></div>'; // Empty cell for time column
        for (let week = startWeek; week <= endWeek; week++) {
            const weekStart = this.getWeekStartDate(week);
            for (let i = 1; i < days.length; i++) {
                let dateStr = '';
                if (weekStart) {
                    const dayDate = new Date(weekStart);
                    // weekStart is Monday (day 1), so add (i-1) days for Tue, Wed, Thu, Fri
                    dayDate.setDate(dayDate.getDate() + (i - 1));
                    dateStr = ` ${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
                }
                html += `<div class="calendar-header calendar-day-header">${days[i]}${dateStr}</div>`;
            }
        }

        // Helper function to assign courses to columns to avoid vertical overlap
        const assignCourseColumns = (week, dayOfWeek) => {
            // Get all courses for this day/week
            const dayCourses = this.courses.filter(c => {
                const courseDays = c.daysOfWeek || [c.dayOfWeek];
                return courseDays.includes(dayOfWeek) &&
                       c.startWeek <= week && (c.startWeek + c.duration - 1) >= week;
            });

            if (dayCourses.length === 0) return new Map();

            // Sort by start time
            dayCourses.sort((a, b) => {
                const aStart = parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1]);
                const bStart = parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1]);
                return aStart - bStart;
            });

            // Assign columns using interval scheduling algorithm
            const columns = []; // Each column is an array of courses
            const courseToColumn = new Map(); // Map course ID to column index

            dayCourses.forEach(course => {
                const courseStart = parseInt(course.startTime.split(':')[0]) * 60 + parseInt(course.startTime.split(':')[1]);
                const courseEnd = parseInt(course.endTime.split(':')[0]) * 60 + parseInt(course.endTime.split(':')[1]);

                // Find first column where this course doesn't overlap with any existing course
                let assignedColumn = -1;
                for (let col = 0; col < columns.length; col++) {
                    const lastCourse = columns[col][columns[col].length - 1];
                    const lastEnd = parseInt(lastCourse.endTime.split(':')[0]) * 60 + parseInt(lastCourse.endTime.split(':')[1]);

                    if (courseStart >= lastEnd) {
                        // No overlap, can use this column
                        columns[col].push(course);
                        assignedColumn = col;
                        break;
                    }
                }

                // If no suitable column found, create new column
                if (assignedColumn === -1) {
                    columns.push([course]);
                    assignedColumn = columns.length - 1;
                }

                courseToColumn.set(course.id, { column: assignedColumn, totalColumns: 0 });
            });

            // Update total columns for all courses
            const totalColumns = columns.length;
            courseToColumn.forEach(value => {
                value.totalColumns = totalColumns;
            });

            return courseToColumn;
        };

        // Pre-calculate column assignments for all days
        const columnAssignments = new Map();
        for (let week = startWeek; week <= endWeek; week++) {
            for (let day = 1; day <= 5; day++) {
                const key = `${week}-${day}`;
                columnAssignments.set(key, assignCourseColumns(week, day));
            }
        }

        // Render cells
        timeSlots.forEach((time, timeIndex) => {
            html += `<div class="calendar-time-label">${time}</div>`;

            for (let week = startWeek; week <= endWeek; week++) {
                for (let day = 1; day <= 5; day++) {
                    const dayOfWeek = day;

                    // Calculate the actual date for this cell
                    const weekStart = this.getWeekStartDate(week);
                    let isUnavailable = false;
                    if (weekStart) {
                        const cellDate = new Date(weekStart);
                        // weekStart is guaranteed to be Monday (day 1)
                        // dayOfWeek: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
                        // So Monday + 0 = Monday, Monday + 1 = Tuesday, etc.
                        cellDate.setDate(cellDate.getDate() + (dayOfWeek - 1));
                        const cellDateString = cellDate.toISOString().split('T')[0];
                        isUnavailable = this.isDateUnavailable(cellDateString);

                        // Debug log for first time slot only
                        if (timeIndex === 0 && this.unavailableDates.length > 0) {
                            console.log(`Week ${week}, Day ${dayOfWeek}: ${cellDateString}, Unavailable: ${isUnavailable}`);
                        }
                    }

                    const coursesAtSlot = this.getCoursesAtTimeSlot(week, week, dayOfWeek, time);

                    // Get column assignments for this day
                    const dayKey = `${week}-${dayOfWeek}`;
                    const dayColumnAssignments = columnAssignments.get(dayKey) || new Map();

                    // Calculate which courses start in this slot
                    const coursesStartingHere = [];
                    let maxColumns = 1;

                    coursesAtSlot.forEach(course => {
                        const startHour = parseInt(course.startTime.split(':')[0]);
                        const slotHour = parseInt(time.split(':')[0]);

                        // Only process courses that START at this time slot
                        if (startHour === slotHour) {
                            const endHour = parseInt(course.endTime.split(':')[0]);
                            const startMinutes = parseInt(course.startTime.split(':')[1]);
                            const endMinutes = parseInt(course.endTime.split(':')[1]);

                            const courseStartTime = startHour * 60 + startMinutes;
                            const courseEndTime = endHour * 60 + endMinutes;
                            const courseDurationMinutes = courseEndTime - courseStartTime;
                            const heightMultiplier = courseDurationMinutes / 60;

                            const columnInfo = dayColumnAssignments.get(course.id) || { column: 0, totalColumns: 1 };
                            if (columnInfo.totalColumns > maxColumns) {
                                maxColumns = columnInfo.totalColumns;
                            }
                            coursesStartingHere.push({ course, heightMultiplier, columnInfo });
                        }
                    });

                    // Calculate cell width based on number of columns
                    const courseWidthPx = 150;
                    const gapPx = 8;
                    const cellWidth = maxColumns * courseWidthPx + (maxColumns - 1) * gapPx + 16; // +16 for padding

                    html += `<div class="calendar-cell ${coursesAtSlot.length > 0 ? 'has-course' : ''} ${isUnavailable ? 'unavailable-date' : ''}"
                             style="min-width: ${cellWidth}px;"
                             data-week="${week}" data-day="${dayOfWeek}" data-time="${time}"
                             title="${isUnavailable ? 'This date is unavailable for scheduling' : ''}">`;

                    coursesStartingHere.forEach(({ course, heightMultiplier, columnInfo }) => {
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

                        // Calculate start and end dates
                        const courseDays = course.daysOfWeek || [course.dayOfWeek];
                        const weekStart = this.getWeekStartDate(course.startWeek);
                        let startDateStr = '';
                        let endDateStr = '';
                        if (weekStart) {
                            // Get actual start date (first day the course runs)
                            const firstDayOfWeek = courseDays[0];
                            const actualStartDate = new Date(weekStart);
                            actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));

                            // Calculate end date
                            const endWeek = course.startWeek + course.duration - 1;
                            const endWeekStart = this.getWeekStartDate(endWeek);
                            const lastDayOfWeek = courseDays[courseDays.length - 1];
                            const actualEndDate = new Date(endWeekStart);
                            actualEndDate.setDate(actualEndDate.getDate() + (lastDayOfWeek - 1));

                            startDateStr = this.formatDate(actualStartDate);
                            endDateStr = this.formatDate(actualEndDate);
                        }

                        // Use course custom color for background and left border
                        const courseColor = course.color;

                        // Use funded/non-funded color for top and right borders
                        const fundedColor = course.funded
                            ? this.settings.fundedCourseColor
                            : this.settings.nonFundedCourseColor;

                        // Use dashed borders for non-funded courses
                        const borderStyle = course.funded ? 'solid' : 'dashed';

                        // Calculate height: each hour slot is 75px min + 1px gap
                        // For multi-hour courses, we need to span across multiple cells visually
                        const cellHeight = 84; // 75px min-height + 1px gap
                        const totalHeight = (heightMultiplier * cellHeight) - 1; // Total pixels to span
                        const zIndex = heightMultiplier > 1 ? 10 : 'auto'; // Bring spanning courses to front

                        // Calculate width and position based on column assignment
                        // Each course gets full cell width, positioned side by side with gap
                        const courseWidthPx = 150; // Fixed width in pixels for each course
                        const gapPx = 8; // Gap between courses
                        const leftPositionPx = columnInfo.column * (courseWidthPx + gapPx);
                        console.log(course);

                        html += `
                            <div class="course-block ${hasIssue ? 'conflict' : ''}"
                                 style="background-color: ${courseColor}20;
                                        border-left-color: ${courseColor};
                                        border-top: 3px ${borderStyle} ${fundedColor};
                                        border-right: 3px ${borderStyle} ${fundedColor};
                                        height: ${totalHeight}px;
                                        position: absolute;
                                        left: ${leftPositionPx}px;
                                        width: ${courseWidthPx}px;
                                        z-index: ${zIndex};"
                                 onclick="planner.openCourseModal('${course.id}')">
                                ${hasIssue ? '<span class="conflict-indicator">!</span>' : ''}
                                <span class="course-name">${course.name} | ${course.code || 'No code'}</span>
                                <div class="course-details">
                                    ${tutor ? tutor.name : 'No tutor'} | ${location ? location.name : 'No location'}
                                </div>
                                ${startDateStr && endDateStr ? `<div class="course-dates">${startDateStr} - ${endDateStr}</div>` : ''}
                            </div>
                        `;
                    });

                    html += '</div>';
                }
            }
        });

        container.innerHTML = html;
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

        // Check for travel time conflicts
        const travelConflicts = this.checkTutorTravelConflicts(newCourse);
        conflicts.push(...travelConflicts);

        return conflicts;
    }

    checkTutorTravelConflicts(newCourse) {
        const conflicts = [];

        // Skip if course has no tutor assigned
        if (!newCourse.tutorId || newCourse.tutorId === 'none') {
            return conflicts;
        }

        // Skip if course has no location assigned
        if (!newCourse.locationId || newCourse.locationId === 'none') {
            return conflicts;
        }

        const tutorName = this.getTutorName(newCourse.tutorId);
        const newLocation = this.locations.find(l => l.id === newCourse.locationId);
        if (!newLocation) return conflicts;

        // Get all courses for the same tutor on the same days (excluding the current course being edited)
        const tutorCourses = this.courses.filter(course =>
            course.id !== newCourse.id &&
            course.tutorId === newCourse.tutorId &&
            course.tutorId !== 'none' &&
            course.locationId !== 'none'
        );

        // Check each day the new course runs
        newCourse.daysOfWeek.forEach(newDay => {
            // Find other courses on the same day
            tutorCourses.forEach(existingCourse => {
                if (!existingCourse.daysOfWeek.includes(newDay)) return;

                // Check if the courses are in overlapping weeks
                const newStart = newCourse.startWeek;
                const newEnd = newCourse.startWeek + newCourse.duration - 1;
                const existingStart = existingCourse.startWeek;
                const existingEnd = existingCourse.startWeek + existingCourse.duration - 1;

                // Check if weeks overlap
                if (newEnd < existingStart || newStart > existingEnd) {
                    return; // No week overlap
                }

                // If locations are the same, no travel time needed
                if (newCourse.locationId === existingCourse.locationId) {
                    return;
                }

                const existingLocation = this.locations.find(l => l.id === existingCourse.locationId);
                if (!existingLocation) return;

                // Get travel time between locations
                const travelMinutes = newLocation.travelTimes?.[existingLocation.id] || 0;
                if (travelMinutes === 0) return; // No travel time configured

                const bufferMinutes = 15; // Optional buffer time
                const requiredGap = travelMinutes + bufferMinutes;

                // Convert times to minutes
                const newStartMinutes = this.timeToMinutes(newCourse.startTime);
                const newEndMinutes = this.timeToMinutes(newCourse.endTime);
                const existingStartMinutes = this.timeToMinutes(existingCourse.startTime);
                const existingEndMinutes = this.timeToMinutes(existingCourse.endTime);

                // Check if the new course starts after the existing course
                if (newStartMinutes > existingEndMinutes) {
                    const actualGap = newStartMinutes - existingEndMinutes;
                    if (actualGap < requiredGap) {
                        conflicts.push({
                            message: `Travel time conflict: "${tutorName}" cannot travel from ${existingLocation.name} (where "${existingCourse.name}" ends at ${existingCourse.endTime}) to ${newLocation.name} in time for this course at ${newCourse.startTime}. Required: ${travelMinutes} minutes travel + ${bufferMinutes} minutes buffer = ${requiredGap} minutes total, but only ${actualGap} minutes available.`,
                            conflictingCourse: existingCourse,
                            type: 'travel'
                        });
                    }
                }

                // Check if the existing course starts after the new course
                if (existingStartMinutes > newEndMinutes) {
                    const actualGap = existingStartMinutes - newEndMinutes;
                    if (actualGap < requiredGap) {
                        conflicts.push({
                            message: `Travel time conflict: "${tutorName}" cannot travel from ${newLocation.name} (where this course ends at ${newCourse.endTime}) to ${existingLocation.name} in time for "${existingCourse.name}" at ${existingCourse.startTime}. Required: ${travelMinutes} minutes travel + ${bufferMinutes} minutes buffer = ${requiredGap} minutes total, but only ${actualGap} minutes available.`,
                            conflictingCourse: existingCourse,
                            type: 'travel'
                        });
                    }
                }
            });
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
            case 'amendments':
                this.generateAmendmentsReport(container);
                break;
        }
    }

    generateTutorScheduleReport(container) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">Tutor Schedules</h3>
                <button id="btn-export-tutor-schedules" class="btn btn-primary" onclick="planner.exportTutorSchedulesToExcel()">📊 Export to Excel</button>
            </div>
        `;

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
                                    <th>Start Date</th>
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

                                    // Get actual start date (not just Monday of the week)
                                    const weekStart = this.getWeekStartDate(course.startWeek);
                                    let startDate = `Week ${course.startWeek}`;
                                    if (weekStart) {
                                        const firstDayOfWeek = courseDays[0]; // Use the first day the course runs
                                        const actualStartDate = new Date(weekStart);
                                        // weekStart is Monday (day 1), so add days to get to the actual first day
                                        actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                                        startDate = this.formatDate(actualStartDate);
                                    }

                                    return `
                                    <tr class="clickable-row" onclick="planner.openCourseModal('${course.id}')" style="${rowStyle}">
                                        <td>${course.code} | ${course.name}</td>
                                        <td>${daysList}</td>
                                        <td>${course.startTime} - ${course.endTime}</td>
                                        <td>${startDate}</td>
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

        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">Tutor Workload - Hours per Week</h3>
                <button id="btn-export-tutor-workload" class="btn btn-primary" onclick="planner.exportTutorWorkloadToExcel()">📊 Export to Excel</button>
            </div>
        `;

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
                                    <th>Start Date</th>
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

                                    // Get actual start date (not just Monday of the week)
                                    const weekStart = this.getWeekStartDate(course.startWeek);
                                    let startDate = `Week ${course.startWeek}`;
                                    if (weekStart) {
                                        const firstDayOfWeek = courseDays[0]; // Use the first day the course runs
                                        const actualStartDate = new Date(weekStart);
                                        // weekStart is Monday (day 1), so add days to get to the actual first day
                                        actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                                        startDate = this.formatDate(actualStartDate);
                                    }

                                    return `
                                    <tr class="clickable-row" onclick="planner.openCourseModal('${course.id}')" style="${rowStyle}">
                                        <td>${course.code} | ${course.name}</td>
                                        <td>${daysList}</td>
                                        <td>${course.startTime} - ${course.endTime}</td>
                                        <td>${startDate}</td>
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">Course List</h3>
                <button id="btn-export-course-list" class="btn btn-primary" onclick="planner.exportCourseListToExcel()">📊 Export to Excel</button>
            </div>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Course Name</th>
                        <th>Tutor</th>
                        <th>Location</th>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Start Date</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedCourses.map(course => {
                        const courseDays = course.daysOfWeek || [course.dayOfWeek];
                        const daysList = courseDays.map(d => days[d]).join('/');

                        // Get actual start date (not just Monday of the week)
                        const weekStart = this.getWeekStartDate(course.startWeek);
                        let startDate = `Week ${course.startWeek}`;
                        if (weekStart) {
                            const firstDayOfWeek = courseDays[0]; // Use the first day the course runs
                            const actualStartDate = new Date(weekStart);
                            // weekStart is Monday (day 1), so add days to get to the actual first day
                            actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                            startDate = this.formatDate(actualStartDate);
                        }

                        return `
                        <tr class="clickable-row" onclick="planner.openCourseModal('${course.id}')" style="cursor: pointer;">
                            <td style="border-left: 4px solid ${course.color}">${course.code} | ${course.name}</td>
                            <td>${this.getTutorName(course.tutorId)}</td>
                            <td>${this.getLocationName(course.locationId)}</td>
                            <td>${daysList}</td>
                            <td>${course.startTime} - ${course.endTime}</td>
                            <td>${startDate}</td>
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
                            <th>Start Date</th>
                            <th>Issues</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${coursesWithIssues.map(item => {
                            const courseDays = item.course.daysOfWeek || [item.course.dayOfWeek];
                            const daysList = courseDays.map(d => days[d]).join('/');

                            // Get actual start date (not just Monday of the week)
                            const weekStart = this.getWeekStartDate(item.course.startWeek);
                            let startDate = `Week ${item.course.startWeek}`;
                            if (weekStart) {
                                const firstDayOfWeek = courseDays[0]; // Use the first day the course runs
                                const actualStartDate = new Date(weekStart);
                                // weekStart is Monday (day 1), so add days to get to the actual first day
                                actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                                startDate = this.formatDate(actualStartDate);
                            }

                            return `
                            <tr class="clickable-row" onclick="planner.openCourseModal('${item.course.id}')" style="cursor: pointer;">
                                <td style="border-left: 4px solid ${item.course.color}">${item.course.code} ${item.course.name}</td>
                                <td>${daysList}</td>
                                <td>${item.course.startTime} - ${item.course.endTime}</td>
                                <td>${startDate}</td>
                                <td style="color: var(--error-color);">${item.issues.join('; ')}</td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
            `;
        }

        container.innerHTML = html;
    }

    generateAmendmentsReport(container) {
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="margin: 0;">Course Amendments History</h3>
                <button id="btn-export-amendments" class="btn btn-primary" onclick="planner.exportAmendmentsToExcel()">📊 Export to Excel</button>
            </div>
        `;

        // Collect all courses with amendments
        const coursesWithAmendments = this.courses.filter(course =>
            course.amendments && course.amendments.length > 0
        );

        if (coursesWithAmendments.length === 0) {
            html += '<p style="color: var(--gray-600); font-size: 1.1rem;">No course amendments have been recorded yet.</p>';
        } else {
            // Sort courses by most recent amendment
            coursesWithAmendments.sort((a, b) => {
                const aLatest = new Date(a.amendments[a.amendments.length - 1].timestamp);
                const bLatest = new Date(b.amendments[b.amendments.length - 1].timestamp);
                return bLatest - aLatest;
            });

            html += `
                <div style="background: #e3f2fd; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--primary-color); margin-bottom: 1rem;">
                    <p><strong>${coursesWithAmendments.length} course(s) have been amended</strong></p>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">Total amendments: ${coursesWithAmendments.reduce((sum, c) => sum + c.amendments.length, 0)}</p>
                </div>
            `;

            coursesWithAmendments.forEach(course => {
                // Get actual start date (not just Monday of the week)
                const courseDays = course.daysOfWeek || [course.dayOfWeek];
                const weekStart = this.getWeekStartDate(course.startWeek);
                let courseStartDate = `Week ${course.startWeek}`;
                if (weekStart) {
                    const firstDayOfWeek = courseDays[0]; // Use the first day the course runs
                    const actualStartDate = new Date(weekStart);
                    // weekStart is Monday (day 1), so add days to get to the actual first day
                    actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                    courseStartDate = this.formatDate(actualStartDate);
                }

                html += `
                    <div style="margin-bottom: 2rem; padding: 1.5rem; background: white; border-radius: 8px; border: 1px solid var(--gray-300); box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h4 style="margin: 0; color: var(--primary-color);">
                                ${course.name} | ${course.code}
                            </h4>
                            <button class="btn btn-sm btn-secondary" onclick="planner.openCourseModal('${course.id}')">View Course</button>
                        </div>
                        <div style="margin-bottom: 0.5rem; color: var(--gray-600); font-size: 0.9rem;">
                            <strong>Current Details:</strong>
                            Start ${courseStartDate},
                            ${course.duration} weeks,
                            ${course.startTime}-${course.endTime},
                            ${this.getTutorName(course.tutorId)} at ${this.getLocationName(course.locationId)}
                        </div>
                        <div style="border-left: 3px solid ${course.color}; padding-left: 1rem;">
                            <strong style="color: var(--gray-700);">Amendment History (${course.amendments.length}):</strong>
                            ${[...course.amendments].reverse().map((amendment, index) => {
                                const date = new Date(amendment.timestamp);
                                const formattedDate = date.toLocaleDateString('en-GB', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });

                                return `
                                    <div style="margin-top: 1rem; padding: 1rem; background: var(--gray-100); border-radius: 6px;">
                                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                                            <span style="font-weight: 600; color: var(--gray-700);">Amendment #${course.amendments.length - index}</span>
                                            <span style="font-size: 0.85rem; color: var(--gray-600);">${formattedDate}</span>
                                        </div>
                                        <div style="background: #fff; padding: 0.75rem; border-radius: 4px; margin-bottom: 0.5rem;">
                                            <strong style="color: var(--error-color);">Reason:</strong> ${amendment.reason}
                                        </div>
                                        ${amendment.changes && amendment.changes.length > 0 ? `
                                            <div style="font-size: 0.9rem;">
                                                <strong>Changes Made:</strong>
                                                <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                                                    ${amendment.changes.map(change => `<li>${change}</li>`).join('')}
                                                </ul>
                                            </div>
                                        ` : '<em style="color: var(--gray-500);">No specific changes recorded</em>'}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html;
    }

    exportAmendmentsToExcel() {
        // Collect all courses with amendments
        const coursesWithAmendments = this.courses.filter(course =>
            course.amendments && course.amendments.length > 0
        );

        if (coursesWithAmendments.length === 0) {
            alert('No course amendments to export.');
            return;
        }

        // Sort courses by most recent amendment
        coursesWithAmendments.sort((a, b) => {
            const aLatest = new Date(a.amendments[a.amendments.length - 1].timestamp);
            const bLatest = new Date(b.amendments[b.amendments.length - 1].timestamp);
            return bLatest - aLatest;
        });

        // Prepare data for Excel
        const excelData = [];

        // Add summary header
        const totalAmendments = coursesWithAmendments.reduce((sum, c) => sum + c.amendments.length, 0);
        excelData.push(['Course Amendments History Report']);
        excelData.push(['Generated:', new Date().toLocaleString('en-GB')]);
        excelData.push(['Total Courses with Amendments:', coursesWithAmendments.length]);
        excelData.push(['Total Amendments:', totalAmendments]);
        excelData.push([]); // Empty row

        // Process each course with amendments
        coursesWithAmendments.forEach((course, courseIndex) => {
            // Calculate start and end dates
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const weekStart = this.getWeekStartDate(course.startWeek);
            let courseStartDate = `Week ${course.startWeek}`;
            let courseEndDate = '';
            if (weekStart) {
                const firstDayOfWeek = courseDays[0];
                const actualStartDate = new Date(weekStart);
                actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));

                const endWeek = course.startWeek + course.duration - 1;
                const endWeekStart = this.getWeekStartDate(endWeek);
                const lastDayOfWeek = courseDays[courseDays.length - 1];
                const actualEndDate = new Date(endWeekStart);
                actualEndDate.setDate(actualEndDate.getDate() + (lastDayOfWeek - 1));

                courseStartDate = this.formatDate(actualStartDate);
                courseEndDate = this.formatDate(actualEndDate);
            }

            // Course header
            excelData.push([`Course ${courseIndex + 1}: ${course.code} - ${course.name}`]);
            excelData.push(['Current Details:']);
            excelData.push(['', 'Start Date:', courseStartDate]);
            excelData.push(['', 'End Date:', courseEndDate]);
            excelData.push(['', 'Duration:', `${course.duration} weeks`]);
            excelData.push(['', 'Time:', `${course.startTime} - ${course.endTime}`]);
            excelData.push(['', 'Tutor:', this.getTutorName(course.tutorId)]);
            excelData.push(['', 'Location:', this.getLocationName(course.locationId)]);
            excelData.push([]); // Empty row

            // Amendment table header
            excelData.push(['', 'Amendment #', 'Date & Time', 'Reason', 'Changes']);

            // Add each amendment (in reverse chronological order)
            [...course.amendments].reverse().forEach((amendment, amendIndex) => {
                const date = new Date(amendment.timestamp);
                const formattedDate = date.toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const changes = amendment.changes && amendment.changes.length > 0
                    ? amendment.changes.join('; ')
                    : 'No specific changes recorded';

                excelData.push([
                    '',
                    amendIndex + 1,
                    formattedDate,
                    amendment.reason || 'No reason provided',
                    changes
                ]);
            });

            excelData.push([]); // Empty row between courses
            excelData.push([]); // Extra spacing
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // Column A (indent)
            { wch: 12 },  // Column B (Amendment #)
            { wch: 20 },  // Column C (Date & Time)
            { wch: 30 },  // Column D (Reason)
            { wch: 60 }   // Column E (Changes)
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Course Amendments');

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const filename = `Course_Amendments_History_${today}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        alert(`Export successful! File saved as: ${filename}`);
    }

    exportCourseListToExcel() {
        if (this.courses.length === 0) {
            alert('No courses to export.');
            return;
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Create workbook
        const wb = XLSX.utils.book_new();

        // Sort courses by start week
        const sortedCourses = [...this.courses].sort((a, b) => a.startWeek - b.startWeek);

        // LAYOUT 1: All courses in a table (rows across the page)
        const allCoursesData = [];

        // Add header row
        allCoursesData.push([
            'Course Code',
            'Course Name',
            'Tutor',
            'Location',
            'Start Date',
            'Duration (weeks)',
            'Start Time',
            'Course Duration (hours)',
            'End Time',
            'Days of Week',
            'Total Number of Days',
            'Student Count',
            'Funded',
            'Notes'
        ]);

        // Add each course as a row
        sortedCourses.forEach(course => {
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const daysList = courseDays.map(d => days[d]).join(', ');

            // Calculate start date
            const weekStart = this.getWeekStartDate(course.startWeek);
            let startDateStr = `Week ${course.startWeek}`;
            if (weekStart) {
                const firstDayOfWeek = courseDays[0];
                const actualStartDate = new Date(weekStart);
                actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                startDateStr = actualStartDate.toLocaleDateString('en-GB');
            }

            // Calculate course duration in hours
            const startTimeParts = course.startTime.split(':');
            const endTimeParts = course.endTime.split(':');
            const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
            const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
            const durationHours = (endMinutes - startMinutes) / 60;

            // Calculate total number of days
            const totalDays = course.duration * courseDays.length;

            allCoursesData.push([
                course.code || 'N/A',
                course.name,
                this.getTutorName(course.tutorId),
                this.getLocationName(course.locationId),
                startDateStr,
                course.duration,
                course.startTime,
                durationHours,
                course.endTime,
                daysList,
                totalDays,
                course.studentCount || 'Not specified',
                course.funded ? 'Yes' : 'No',
                course.notes || 'None'
            ]);
        });

        // Create worksheet for all courses table
        const wsAll = XLSX.utils.aoa_to_sheet(allCoursesData);

        // Set column widths for all courses table
        wsAll['!cols'] = [
            { wch: 15 },  // Course Code
            { wch: 30 },  // Course Name
            { wch: 20 },  // Tutor
            { wch: 20 },  // Location
            { wch: 12 },  // Start Date
            { wch: 12 },  // Duration (weeks)
            { wch: 10 },  // Start Time
            { wch: 18 },  // Course Duration (hours)
            { wch: 10 },  // End Time
            { wch: 20 },  // Days of Week
            { wch: 18 },  // Total Number of Days
            { wch: 15 },  // Student Count
            { wch: 10 },  // Funded
            { wch: 30 }   // Notes
        ];

        // Add "All Courses" worksheet as the first tab
        XLSX.utils.book_append_sheet(wb, wsAll, 'All Courses');

        // LAYOUT 2: Individual tabs for each course (vertical layout)
        // Track used sheet names to handle duplicates
        const usedSheetNames = new Set(['All Courses']);

        sortedCourses.forEach((course, index) => {
            // Calculate course details
            const courseDays = course.daysOfWeek || [course.dayOfWeek];
            const daysList = courseDays.map(d => days[d]).join(', ');

            // Calculate start date
            const weekStart = this.getWeekStartDate(course.startWeek);
            let startDateStr = `Week ${course.startWeek}`;
            if (weekStart) {
                const firstDayOfWeek = courseDays[0];
                const actualStartDate = new Date(weekStart);
                actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                startDateStr = actualStartDate.toLocaleDateString('en-GB');
            }

            // Calculate course duration in hours
            const startTimeParts = course.startTime.split(':');
            const endTimeParts = course.endTime.split(':');
            const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
            const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
            const durationHours = (endMinutes - startMinutes) / 60;

            // Calculate total number of days
            const totalDays = course.duration * courseDays.length;

            // Prepare data for this course
            const courseData = [
                ['Course Code', course.code || 'N/A'],
                ['Course Name', course.name],
                ['Tutor', this.getTutorName(course.tutorId)],
                ['Location', this.getLocationName(course.locationId)],
                ['Start Date', startDateStr],
                ['Duration (weeks)', course.duration],
                ['Start Time', course.startTime],
                ['Course Duration (hours)', durationHours],
                ['End Time', course.endTime],
                ['Days of Week', daysList],
                ['Total Number of Days', totalDays],
                [],
                ['Additional Information'],
                ['Student Count', course.studentCount || 'Not specified'],
                ['Funded', course.funded ? 'Yes' : 'No'],
                ['Notes', course.notes || 'None']
            ];

            // Create worksheet
            const ws = XLSX.utils.aoa_to_sheet(courseData);

            // Set column widths
            ws['!cols'] = [
                { wch: 25 },  // Column A (labels)
                { wch: 40 }   // Column B (values)
            ];

            // Create a safe sheet name (Excel has 31 char limit and doesn't allow certain chars)
            let sheetName = course.code || `Course ${index + 1}`;
            // Remove invalid characters for Excel sheet names
            sheetName = sheetName.replace(/[\\\/\*\?\[\]:]/g, '_');
            // Truncate to 31 characters
            if (sheetName.length > 31) {
                sheetName = sheetName.substring(0, 31);
            }

            // Handle duplicate sheet names by adding a number suffix
            let finalSheetName = sheetName;
            let counter = 1;
            while (usedSheetNames.has(finalSheetName)) {
                const suffix = `_${counter}`;
                // Make sure the name with suffix doesn't exceed 31 chars
                const maxBaseLength = 31 - suffix.length;
                finalSheetName = sheetName.substring(0, maxBaseLength) + suffix;
                counter++;
            }
            usedSheetNames.add(finalSheetName);

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
        });

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const filename = `Course_List_${today}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        alert(`Export successful! ${sortedCourses.length} courses exported to ${filename}\n\nThe file contains:\n- "All Courses" tab with table layout\n- Individual tabs for each course`);
    }

    exportTutorSchedulesToExcel() {
        if (this.tutors.length === 0) {
            alert('No tutors to export.');
            return;
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Create workbook
        const wb = XLSX.utils.book_new();

        // LAYOUT 1: Summary tab with all tutors
        const summaryData = [];
        summaryData.push(['Tutor Schedules Summary']);
        summaryData.push(['Generated:', new Date().toLocaleString('en-GB')]);
        summaryData.push(['Total Tutors:', this.tutors.length]);
        summaryData.push(['Total Courses:', this.courses.length]);
        summaryData.push([]);
        summaryData.push(['Tutor', 'Number of Courses', 'Total Hours per Week', 'Contact Info']);

        // Calculate summary for each tutor
        this.tutors.forEach(tutor => {
            const tutorCourses = this.courses.filter(c => c.tutorId === tutor.id);

            // Calculate total hours per week for this tutor
            let totalHoursPerWeek = 0;
            tutorCourses.forEach(course => {
                const startTimeParts = course.startTime.split(':');
                const endTimeParts = course.endTime.split(':');
                const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
                const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
                const hoursPerSession = (endMinutes - startMinutes) / 60;
                const courseDays = course.daysOfWeek || [course.dayOfWeek];
                totalHoursPerWeek += hoursPerSession * courseDays.length;
            });

            summaryData.push([
                tutor.name,
                tutorCourses.length,
                totalHoursPerWeek.toFixed(1),
                tutor.email || tutor.phone || 'Not provided'
            ]);
        });

        // Create summary worksheet
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [
            { wch: 25 },  // Tutor name
            { wch: 18 },  // Number of courses
            { wch: 20 },  // Total hours
            { wch: 30 }   // Contact info
        ];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // LAYOUT 2: Individual tab for each tutor with their full schedule
        this.tutors.forEach(tutor => {
            const tutorCourses = this.courses.filter(c => c.tutorId === tutor.id);

            // Prepare data for this tutor
            const tutorData = [];
            tutorData.push([tutor.name]);
            tutorData.push(['Email:', tutor.email || 'Not provided']);
            tutorData.push(['Phone:', tutor.phone || 'Not provided']);
            tutorData.push(['Skills:', tutor.skills || 'Not specified']);
            tutorData.push([]);

            if (tutorCourses.length === 0) {
                tutorData.push(['No courses assigned to this tutor']);
            } else {
                tutorData.push(['Total Courses:', tutorCourses.length]);
                tutorData.push([]);

                // Course table header
                tutorData.push([
                    'Course Code',
                    'Course Name',
                    'Days',
                    'Start Time',
                    'End Time',
                    'Duration (hours)',
                    'Start Date',
                    'Duration (weeks)',
                    'Location',
                    'Student Count'
                ]);

                // Add each course
                tutorCourses.forEach(course => {
                    const courseDays = course.daysOfWeek || [course.dayOfWeek];
                    const daysList = courseDays.map(d => days[d]).join(', ');

                    // Calculate start date
                    const weekStart = this.getWeekStartDate(course.startWeek);
                    let startDateStr = `Week ${course.startWeek}`;
                    if (weekStart) {
                        const firstDayOfWeek = courseDays[0];
                        const actualStartDate = new Date(weekStart);
                        actualStartDate.setDate(actualStartDate.getDate() + (firstDayOfWeek - 1));
                        startDateStr = actualStartDate.toLocaleDateString('en-GB');
                    }

                    // Calculate course duration in hours
                    const startTimeParts = course.startTime.split(':');
                    const endTimeParts = course.endTime.split(':');
                    const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
                    const endMinutes = parseInt(endTimeParts[0]) * 60 + parseInt(endTimeParts[1]);
                    const durationHours = (endMinutes - startMinutes) / 60;

                    tutorData.push([
                        course.code || 'N/A',
                        course.name,
                        daysList,
                        course.startTime,
                        course.endTime,
                        durationHours,
                        startDateStr,
                        course.duration,
                        this.getLocationName(course.locationId),
                        course.studentCount || 'Not specified'
                    ]);
                });
            }

            // Create worksheet for this tutor
            const ws = XLSX.utils.aoa_to_sheet(tutorData);
            ws['!cols'] = [
                { wch: 15 },  // Course Code
                { wch: 30 },  // Course Name
                { wch: 15 },  // Days
                { wch: 10 },  // Start Time
                { wch: 10 },  // End Time
                { wch: 15 },  // Duration (hours)
                { wch: 12 },  // Start Date
                { wch: 15 },  // Duration (weeks)
                { wch: 20 },  // Location
                { wch: 15 }   // Student Count
            ];

            // Create safe sheet name
            let sheetName = tutor.name;
            // Remove invalid characters for Excel sheet names
            sheetName = sheetName.replace(/[\\\/\*\?\[\]:]/g, '_');
            // Truncate to 31 characters
            if (sheetName.length > 31) {
                sheetName = sheetName.substring(0, 31);
            }

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const filename = `Tutor_Schedules_${today}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        alert(`Export successful! ${this.tutors.length} tutors exported to ${filename}\n\nThe file contains:\n- "Summary" tab with overview of all tutors\n- Individual tabs for each tutor with their full schedule`);
    }

    exportTutorWorkloadToExcel() {
        if (this.tutors.length === 0) {
            alert('No tutors to export.');
            return;
        }

        // Create workbook
        const wb = XLSX.utils.book_new();

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

        // LAYOUT 1: Summary tab with all tutors statistics
        const summaryData = [];
        summaryData.push(['Tutor Workload Report - Hours per Week']);
        summaryData.push(['Generated:', new Date().toLocaleString('en-GB')]);
        summaryData.push(['Total Tutors:', this.tutors.length]);
        summaryData.push([]);
        summaryData.push(['Tutor', 'Total Hours', 'Weeks Worked', 'Average Hours/Week', 'Peak Hours/Week', 'Courses Assigned']);

        tutorWorkload.forEach(data => {
            const tutorCourses = this.courses.filter(c => c.tutorId === data.tutor.id);
            summaryData.push([
                data.tutor.name,
                parseFloat(data.totalHours.toFixed(1)),
                data.weeksWorked,
                parseFloat(data.averageHours.toFixed(1)),
                parseFloat(data.maxHours.toFixed(1)),
                tutorCourses.length
            ]);
        });

        // Create summary worksheet
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [
            { wch: 25 },  // Tutor name
            { wch: 12 },  // Total hours
            { wch: 15 },  // Weeks worked
            { wch: 18 },  // Average hours
            { wch: 15 },  // Peak hours
            { wch: 16 }   // Courses assigned
        ];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // LAYOUT 2: Individual tab for each tutor with weekly breakdown
        const usedSheetNames = new Set(['Summary']);

        tutorWorkload.forEach((data) => {
            const tutorData = [];
            tutorData.push([data.tutor.name]);
            tutorData.push([]);
            tutorData.push(['Statistics:']);
            tutorData.push(['Total Hours:', parseFloat(data.totalHours.toFixed(1))]);
            tutorData.push(['Weeks Worked:', data.weeksWorked, '/ 40']);
            tutorData.push(['Average Hours/Week:', parseFloat(data.averageHours.toFixed(1)), '(when working)']);
            tutorData.push(['Peak Hours/Week:', parseFloat(data.maxHours.toFixed(1))]);
            tutorData.push([]);
            tutorData.push(['Weekly Breakdown:']);
            tutorData.push(['Week', 'Hours']);

            // Add each week with hours (only weeks with hours > 0)
            data.weeklyHours.forEach((hours, weekIndex) => {
                if (hours > 0) {
                    tutorData.push([
                        weekIndex + 1,
                        parseFloat(hours.toFixed(1))
                    ]);
                }
            });

            // Create worksheet for this tutor
            const ws = XLSX.utils.aoa_to_sheet(tutorData);
            ws['!cols'] = [
                { wch: 20 },  // Week or label column
                { wch: 15 },  // Hours or value column
                { wch: 15 }   // Additional info column
            ];

            // Create safe sheet name
            let sheetName = data.tutor.name;
            // Remove invalid characters for Excel sheet names
            sheetName = sheetName.replace(/[\\\/\*\?\[\]:]/g, '_');
            // Truncate to 31 characters
            if (sheetName.length > 31) {
                sheetName = sheetName.substring(0, 31);
            }

            // Handle duplicate sheet names
            let finalSheetName = sheetName;
            let counter = 1;
            while (usedSheetNames.has(finalSheetName)) {
                const suffix = `_${counter}`;
                const maxBaseLength = 31 - suffix.length;
                finalSheetName = sheetName.substring(0, maxBaseLength) + suffix;
                counter++;
            }
            usedSheetNames.add(finalSheetName);

            XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
        });

        // Generate filename with current date
        const today = new Date().toISOString().split('T')[0];
        const filename = `Tutor_Workload_${today}.xlsx`;

        // Save file
        XLSX.writeFile(wb, filename);

        alert(`Export successful! ${tutorWorkload.length} tutors exported to ${filename}\n\nThe file contains:\n- "Summary" tab with workload statistics for all tutors\n- Individual tabs for each tutor with weekly hour breakdown`);
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
            csv += `"${course.code || 'No code'}",`;
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

    anonymizeForAI(data) {
        // Create anonymization mapping
        const mapping = {
            tutors: {},
            locations: {}
        };

        // Deep clone the data
        const anonymized = JSON.parse(JSON.stringify(data));

        // Anonymize tutors
        anonymized.tutors = anonymized.tutors.map((tutor, index) => {
            const anonId = `TUTOR_${String.fromCharCode(65 + index)}`; // TUTOR_A, TUTOR_B, etc.
            mapping.tutors[tutor.id] = {
                anonName: anonId,
                originalName: tutor.name,
                originalEmail: tutor.email || null,
                originalPhone: tutor.phone || null
            };

            return {
                ...tutor,
                name: anonId,
                email: tutor.email ? `${anonId.toLowerCase()}@example.com` : null,
                phone: tutor.phone ? '[REDACTED]' : null
            };
        });

        // Anonymize locations
        anonymized.locations = anonymized.locations.map((location, index) => {
            const anonName = `VENUE_${index + 1}`; // VENUE_1, VENUE_2, etc.
            mapping.locations[location.id] = {
                anonName: anonName,
                originalName: location.name
            };

            return {
                ...location,
                name: anonName
            };
        });

        // Store mapping locally (NOT in the export)
        localStorage.setItem('piiMapping', JSON.stringify(mapping));
        console.log('🔒 PII mapping stored locally (not exported)');

        return anonymized;
    }

    deAnonymizeFromAI(data) {
        // Retrieve mapping
        const mappingJson = localStorage.getItem('piiMapping');
        if (!mappingJson) {
            console.warn('⚠️ No PII mapping found. Data will remain anonymized.');
            return data;
        }

        const mapping = JSON.parse(mappingJson);
        const deAnonymized = JSON.parse(JSON.stringify(data));

        // De-anonymize tutors
        deAnonymized.tutors = deAnonymized.tutors.map(tutor => {
            // Find the original tutor by matching the anonymized name
            const originalTutor = Object.entries(mapping.tutors).find(
                ([id, info]) => info.anonName === tutor.name
            );

            if (originalTutor) {
                const [originalId, info] = originalTutor;
                return {
                    ...tutor,
                    id: originalId, // Restore original ID
                    name: info.originalName,
                    email: info.originalEmail,
                    phone: info.originalPhone
                };
            }
            return tutor;
        });

        // De-anonymize locations
        deAnonymized.locations = deAnonymized.locations.map(location => {
            // Find the original location by matching the anonymized name
            const originalLocation = Object.entries(mapping.locations).find(
                ([id, info]) => info.anonName === location.name
            );

            if (originalLocation) {
                const [originalId, info] = originalLocation;
                return {
                    ...location,
                    id: originalId, // Restore original ID
                    name: info.originalName
                };
            }
            return location;
        });

        console.log('🔓 Data de-anonymized successfully');
        return deAnonymized;
    }

    exportForAI() {
        // Analyze all conflicts and issues
        const conflicts = this.detectAllConflicts();
        const unavailableResources = this.detectUnavailableResources();
        const qualificationIssues = this.detectQualificationIssues();

        // Build enhanced data structure
        const rawData = {
            tutors: this.tutors,
            locations: this.locations,
            courses: this.courses,
            unavailableDates: this.unavailableDates || [],
            week1StartDate: this.week1StartDate,
            metadata: {
                totalWeeks: 40,
                timeSlots: "09:00-17:00 (courses can span multiple hours)",
                daysOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                workingDays: "Monday-Friday only (days 1-5)",
                exportDate: new Date().toISOString()
            }
        };

        // ANONYMIZE all PII data before sending to AI
        const aiData = this.anonymizeForAI(rawData);

        // Add SIMPLIFIED issues summary (no full course objects to reduce size)
        aiData.issues = {
            conflictsSummary: conflicts.map(c => ({
                type: c.type,
                message: c.message,
                course1Id: c.course1?.id,
                course2Id: c.course2?.id
            })),
            unavailableResourcesSummary: unavailableResources.map(ur => ({
                courseId: ur.courseId,
                courseName: ur.courseName,
                issues: ur.issues
            })),
            qualificationIssuesSummary: qualificationIssues.map(qi => ({
                courseId: qi.courseId,
                courseName: qi.courseName,
                issue: qi.issue
            })),
            summary: {
                totalConflicts: conflicts.length,
                totalUnavailableResources: unavailableResources.length,
                totalQualificationIssues: qualificationIssues.length
            }
        };

        // Add PII notice to metadata
        aiData.metadata.piiNotice = "⚠️ All personal data (tutor names, emails, phones, location names) has been anonymized for privacy. Original data is stored locally and will be restored on import.";

        // Generate AI prompt
        const prompt = this.generateAIPrompt(aiData);

        // Copy to clipboard
        const fullText = prompt + "\n\n```json\n" + JSON.stringify(aiData, null, 2) + "\n```";

        // Check if the text might be too long
        const textLength = fullText.length;
        const isLarge = textLength > 50000;
        const warningText = isLarge ?
            '\n\n⚠️ LARGE DATASET WARNING:\nYour data is quite large. If the AI says the JSON was cut off:\n- Use Claude.ai (supports larger inputs)\n- OR simplify by temporarily removing some courses\n- OR use the "conflicts report" to fix issues manually' : '';

        navigator.clipboard.writeText(fullText).then(() => {
            alert(`✅ AI optimization request copied to clipboard!\n\n🔒 PII PROTECTION: All tutor names, emails, phones, and location names have been anonymized.\n\nData size: ${(textLength / 1024).toFixed(1)}KB${warningText}\n\nNext steps:\n1. Open Claude.ai or ChatGPT\n2. Paste the copied text (Ctrl+V)\n3. The AI will analyze and fix all issues\n4. Copy the AI\'s entire response\n5. Click "📋 Paste JSON from AI" to import it back\n\nYour original data will be automatically restored on import!`);
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

        // Count unavailable dates
        const unavailableDatesCount = data.unavailableDates ? data.unavailableDates.length : 0;
        let unavailableDatesInfo = '';
        if (unavailableDatesCount > 0) {
            unavailableDatesInfo = `\n\n**⚠️ CRITICAL: ${unavailableDatesCount} Unavailable Date(s):**\n`;
            data.unavailableDates.forEach(entry => {
                if (entry.type === 'single') {
                    unavailableDatesInfo += `- ${entry.date}: ${entry.reason}\n`;
                } else {
                    unavailableDatesInfo += `- ${entry.startDate} to ${entry.endDate}: ${entry.reason}\n`;
                }
            });
            unavailableDatesInfo += '\n**You MUST NOT schedule courses on these dates. Calculate which weeks/days these dates fall on and avoid them.**';
        }

        return `I have a course scheduling system for an adult learning center with ${data.courses.length} courses, ${data.tutors.length} tutors, and ${data.locations.length} locations.

I need you to analyze the JSON data below and automatically fix ALL scheduling issues while respecting all constraints.

## Current Issues:
- **${issues.summary.totalConflicts} conflicts** (tutor/location double-bookings)
- **${issues.summary.totalUnavailableResources} availability issues** (resources not available at scheduled times)
- **${issues.summary.totalQualificationIssues} qualification issues** (tutors assigned to courses they're not qualified to teach)
${unavailableDatesInfo}

## CRITICAL CONSTRAINTS:

**📅 Week System:**
- Week 1 starts on: ${data.week1StartDate} (MUST be a Monday)
- All weeks run Monday-Friday only
- Planning period: Weeks 1-40

**🚫 Courses run MONDAY-FRIDAY ONLY:**
- Day numbers: 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
- **NEVER use day 0 (Sunday) or day 6 (Saturday)**
- The \`daysOfWeek\` array must ONLY contain values [1, 2, 3, 4, 5]

**🔒 Unavailable Dates (NO COURSES ALLOWED):**
${data.unavailableDates && data.unavailableDates.length > 0 ?
`The following dates are blocked for scheduling:
${data.unavailableDates.map(entry => {
    if (entry.type === 'single') {
        return `  - ${entry.date} (${entry.reason})`;
    } else {
        return `  - ${entry.startDate} to ${entry.endDate} (${entry.reason})`;
    }
}).join('\n')}

**IMPORTANT:** Calculate which weeks these dates fall in based on week1StartDate, and ensure no course sessions fall on these dates.`
: 'None specified'}

## Data Structure:

**Tutors:**
- \`id\`: unique identifier
- \`name\`, \`email\`, \`phone\`, \`skills\`: contact info (may be anonymized for privacy)
- \`canTeach\`: array of course IDs this tutor is qualified to teach
- \`recurringAvailability\`: object mapping day numbers (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri) to time periods ["morning", "afternoon", "evening"]
  - morning: 09:00-12:00, afternoon: 12:00-17:00, evening: 17:00-21:00
- \`customAvailability\`: array of specific date/time exceptions

**Locations:**
- \`id\`: unique identifier
- \`name\`, \`capacity\`, \`facilities\`: location info (name may be anonymized for privacy)
- \`recurringAvailability\`: same format as tutors (days 1-5 only)

**Courses:**
- \`id\`: unique identifier
- \`name\`, \`code\`, \`color\`, \`funded\`, \`notes\`: course info
- \`tutorId\`: assigned tutor (can be "none" if not yet assigned)
- \`locationId\`: assigned location (can be "none" if not yet assigned)
- \`qualifiedTutors\`: array of tutor IDs who CAN teach this course
- \`daysOfWeek\`: array of day numbers (MUST be 1-5 ONLY, NO weekends)
- \`startTime\`, \`endTime\`: time in HH:MM format (24-hour)
- \`startWeek\`: which week course starts (1-40)
- \`duration\`: how many weeks course runs
- \`amendments\`: array of amendment history (preserve this, don't modify)

**Unavailable Dates:**
- \`unavailableDates\`: array of date entries
  - \`type\`: "single" or "range"
  - \`date\`: for single dates (YYYY-MM-DD)
  - \`startDate\`, \`endDate\`: for date ranges
  - \`reason\`: explanation (e.g., "Christmas Holiday")

## Requirements:

1. **Fix all conflicts**: No tutor or location can be double-booked
2. **Respect availability**: Only assign tutors/locations when they're marked as available
3. **Respect qualifications**: Only assign tutors from the course's \`qualifiedTutors\` list
4. **Monday-Friday ONLY**: Courses can ONLY run on days 1-5 (never 0 or 6)
5. **Avoid unavailable dates**: Do NOT schedule courses on blocked dates
6. **Preserve when possible**:
   - Keep course times and days the same if possible
   - Only change tutor/location assignments when necessary
   - If changing times, stay within resource availability
   - Keep \`amendments\` array unchanged

## Your Task - DO NOT ASK QUESTIONS, JUST FIX:

**IMPORTANT**: Do NOT ask for clarification. Use these rules to fix automatically:

1. **Analyze** all the issues listed above
2. **Calculate** which dates fall on unavailable dates and avoid them
3. **Fix conflicts** using this priority order:
   - FIRST: Try reassigning to a different qualified tutor (check \`qualifiedTutors\` array)
   - SECOND: Try reassigning to a different available location
   - THIRD: Only if absolutely necessary, shift course to a different week (within availability)
   - LAST RESORT: Change time slots (but keep within the same day if possible)
4. **Qualification fixes**: If a tutor is not in \`qualifiedTutors\`, automatically reassign to ANY tutor who IS in that array AND is available
5. **Availability fixes**: If tutor/location not available, automatically find an available alternative from the qualified list
6. **Monday-Friday ONLY**: Ensure all \`daysOfWeek\` values are 1-5 only
7. **Preserve what you can**: Keep times, days, and duration the same unless fixing requires changes
8. **Return** the COMPLETE corrected JSON with ALL tutors, locations, courses, and unavailableDates

## Critical Rules - NO EXCEPTIONS:

✅ **You CAN**: Reassign tutors freely (as long as they're in \`qualifiedTutors\`)
✅ **You CAN**: Reassign locations freely (as long as they're available)
✅ **You CAN**: Move courses to different weeks if needed
✅ **You CAN**: Change course times if absolutely necessary
✅ **You MUST**: Fix ALL conflicts, qualification issues, and availability issues
✅ **You MUST**: Only use days 1-5 (Monday-Friday)
✅ **You MUST**: Avoid all dates in \`unavailableDates\`
❌ **You CANNOT**: Leave any issues unfixed
❌ **You CANNOT**: Assign unqualified tutors
❌ **You CANNOT**: Schedule on unavailable dates
❌ **You CANNOT**: Use days 0 or 6 (weekends)
❌ **You CANNOT**: Ask questions - just apply the rules above

## Output Format:

Return ONLY the corrected JSON in a markdown code block (use triple backticks with json language tag). Include ALL fields unchanged except what you fixed. Do NOT add explanations before or after the JSON. Do NOT modify \`unavailableDates\` or \`amendments\` arrays.

**IMPORTANT**: If you see this message was cut off or truncated, respond ONLY with: "DATA TOO LARGE - Please reduce course count or use API" - do NOT try to fix incomplete data.

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

            // Check if data is anonymized (contains TUTOR_A, VENUE_1, etc.)
            const isAnonymized = data.tutors.some(t => t.name && t.name.startsWith('TUTOR_')) ||
                                data.locations.some(l => l.name && l.name.startsWith('VENUE_'));

            if (isAnonymized) {
                console.log('🔒 Anonymized data detected. De-anonymizing...');
                const deAnonymizedData = this.deAnonymizeFromAI(data);

                // Close paste modal and show preview
                this.closeModal('modal-paste-json');
                this.showImportPreview(deAnonymizedData);
            } else {
                // Close paste modal and show preview
                this.closeModal('modal-paste-json');
                this.showImportPreview(data);
            }

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

                // Check if data is anonymized and de-anonymize if needed
                const isAnonymized = data.tutors.some(t => t.name && t.name.startsWith('TUTOR_')) ||
                                    data.locations.some(l => l.name && l.name.startsWith('VENUE_'));

                const finalData = isAnonymized ? this.deAnonymizeFromAI(data) : data;

                // Show preview/comparison
                this.showImportPreview(finalData);

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
