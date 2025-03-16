# Cashflow Forecast App

A web-based application for tracking, visualizing, and forecasting personal or business cashflow. This application helps users manage recurring and one-off transactions, visualize their financial future, and make informed financial decisions.

## Features

- **Transaction Management**:
  - Add recurring transactions (weekly, fortnightly, monthly)
  - Add one-off transactions
  - Edit or delete existing transactions
  - Hide transactions from calculations

- **Visual Forecasting**:
  - Interactive cashflow graph showing projected balance over time
  - Monthly balance table
  - Customizable date ranges with preset options (1M, 3M, 6M, 1Y)
  - Graph image export functionality

- **Data Storage Options**:
  - Cloud storage with Firebase integration
  - Local file storage (JSON)
  - User authentication for secure access

## Technology Stack

- HTML5, CSS3, and JavaScript
- [Chart.js](https://www.chartjs.org/) for data visualization
- [Firebase](https://firebase.google.com/) for authentication and data storage
- Responsive design for mobile and desktop compatibility

## Installation

### Local Development

**Opening index.html wont allow Google login, however the local file save should work**

1. Clone the repository:
```git clone https://github.com/jantoney/cashapp```


2. Navigate to the project directory:
```cd cashapp```


3. Open `index.html` in your web browser or use a local development server.

### Using Docker

You can run the application using Docker with the provided `docker-compose.yml` file:

```docker-compose up -d```


This will start the application on port 3333. Access it at http://localhost:3333.

## Usage

1. **Authentication**:
   - Sign up for a new account or log in with existing credentials
   - Google sign-in option is also available

2. **Adding Transactions**:
   - Use the "Add Transaction" card to enter new transactions
   - Select the appropriate tab for recurring or one-off transactions
   - Fill in all required details (description, date, amount, etc.)
   - Specify whether it's money in or money out
   - Click the "Add" button

3. **Visualizing Cashflow**:
   - Set the date range for the graph manually or use preset buttons
   - Click "Update" to refresh the graph
   - View monthly balance projections in the side table
   - Copy the graph as an image if needed

4. **Managing Data**:
   - Save your data to the cloud with "Save to Cloud"
   - Load your cloud data with "Load from Cloud"
   - Or use local file options to save/load from your device

## Development

### Project Structure

- `index.html` - Main application HTML
- `style.css` - Application styling
- `/js` directory:
  - `app.js` - Main application logic and event handlers
  - `auth.js` - Authentication functionality
  - `chart.js` - Graph rendering and data visualization
  - `firebase-config.js` - Firebase configuration
  - `transactions.js` - Transaction management
  - `utils.js` - Utility functions and global variables

## License

[Add your license information here]

## Deployment

The application is currently deployed at [cashapp.blpromotions.com.au](https://cashapp.blpromotions.com.au/).