# Adult Learning Course Planner

A comprehensive web-based course planning application designed for adult learning programs. Plan courses across multiple weeks, manage tutors and locations, detect scheduling conflicts, and generate reports.

![Course Planner](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### 📅 Course Management
- Schedule courses across 20 weeks
- Multi-week course support
- Color-coded courses for easy identification
- Drag-free calendar view with week/4-week modes
- Visual conflict detection with alerts

### 👨‍🏫 Tutor Management
- Add tutors with contact information and skills
- Set recurring availability (morning/afternoon/evening)
- Add custom availability periods and exceptions
- Track which tutors are teaching which courses

### 📍 Location Management
- Manage locations with capacity and facilities
- Set recurring availability patterns
- Track room utilization
- Custom availability exceptions

### ⚠️ Conflict Detection
- Real-time double-booking detection
- Visual conflict indicators in calendar
- Tutor availability validation
- Location availability validation
- Warning prompts before scheduling conflicts

### 📊 Reporting & Analytics
- Tutor schedule reports
- Location utilization reports
- Course list reports
- Conflict reports
- Resource utilization dashboard

### 💾 Data Management
- Automatic localStorage saving
- Export to Excel/CSV
- Export to JSON (full backup)
- Import from JSON
- Print to PDF capability

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- No server or installation required!

### Installation

1. **Download the files**
   ```bash
   git clone https://github.com/yourusername/rachel-planner.git
   cd rachel-planner
   ```

2. **Open in browser**
   - Simply open `index.html` in your web browser
   - No build process needed!

### Quick Start

1. **Set Week 1 Start Date**
   - Go to Dashboard
   - Set the Monday when Week 1 begins
   - This allows the system to calculate current week

2. **Add Tutors**
   - Click "Tutors" → "Add Tutor"
   - Enter name and contact details
   - Set their recurring availability (which days/periods they work)

3. **Add Locations**
   - Click "Locations" → "Add Location"
   - Enter room name, capacity, and facilities
   - Set when the location is available

4. **Schedule Courses**
   - Click "Courses" → "Add Course"
   - Fill in course details
   - The system will warn you if there are conflicts
   - Courses appear in the calendar view

## Usage Guide

### Setting Availability

**Recurring Availability:**
- Morning: 6 AM - 12 PM
- Afternoon: 12 PM - 5 PM
- Evening: 5 PM - 10 PM

Check the boxes for days and periods when tutors/locations are available.

**Custom Availability:**
- Add specific date/time exceptions
- Useful for one-off availability or unavailability

### Understanding Conflicts

The system detects two types of conflicts:
1. **Tutor Conflicts** - Same tutor teaching two courses at the same time
2. **Location Conflicts** - Same room being used for two courses at the same time

**Note:** Two courses at the same time with different tutors and different locations = NO conflict!

### Calendar Navigation

- **Week View** - See one week in detail
- **4 Weeks View** - See four weeks side-by-side
- **Navigation** - Use arrows to move between weeks
- **Week Headers** - Show week number and starting date (w/b = week beginning)

### Exporting Data

**Excel/CSV Export:**
- Contains all courses with tutor, location, day, time details
- Opens in Excel, Google Sheets, etc.

**JSON Export:**
- Complete backup of all data
- Includes tutors, locations, courses, and settings
- Use for backup or transferring to another computer

**PDF Export:**
- Use browser's print function (Ctrl+P)
- Save as PDF for printing or sharing

## Technical Details

### Technologies Used
- **HTML5** - Structure
- **CSS3** - Styling with custom properties and grid layout
- **Vanilla JavaScript** - No frameworks or dependencies
- **localStorage API** - Data persistence

### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+

### Data Storage
- All data stored in browser's localStorage
- Maximum storage: ~10MB (far more than needed)
- Data persists across sessions
- Specific to browser and computer

## File Structure

```
rachel-planner/
├── index.html          # Main HTML file
├── styles.css          # All styles and layouts
├── app.js             # Application logic
└── README.md          # This file
```

## Features Roadmap

Potential future enhancements:
- [ ] Email notifications for upcoming courses
- [ ] Student enrollment tracking
- [ ] Attendance recording
- [ ] Multi-user support with cloud sync
- [ ] Mobile app version
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Automated report scheduling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Known Issues

- Data is browser-specific (not synced across devices)
- No undo functionality (export regularly for safety)
- Print/PDF export requires manual browser print dialog

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: [your-email@example.com]

## Acknowledgments

Built with Claude Code and Anthropic's Claude AI assistant.

## Changelog

### Version 1.0.0 (2025)
- Initial release
- Core scheduling functionality
- Tutor and location management
- Conflict detection
- Reporting features
- Export/import capabilities
