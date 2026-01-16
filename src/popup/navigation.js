// Navigation functions for popup UI

export function showMainScreen() {
  const mainScreen = document.getElementById('mainScreen');
  const settingsScreen = document.getElementById('settingsScreen');
  
  if (mainScreen) mainScreen.style.display = 'block';
  if (settingsScreen) settingsScreen.style.display = 'none';
}

export function showSettingsScreen() {
  const mainScreen = document.getElementById('mainScreen');
  const settingsScreen = document.getElementById('settingsScreen');
  
  if (mainScreen) mainScreen.style.display = 'none';
  if (settingsScreen) settingsScreen.style.display = 'block';
}

export function init() {
  // Set up event listeners
  const menuBtn = document.getElementById('menuBtn');
  const backBtn = document.getElementById('backBtn');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', showSettingsScreen);
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', showMainScreen);
  }
  
  // Show main screen by default
  showMainScreen();
}