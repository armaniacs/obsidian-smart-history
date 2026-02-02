/**
 * navigation.test.js
 * Navigation Functionality Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { showMainScreen, showSettingsScreen, init } from 'src/popup/navigation.js';
import { getScreenState, setScreenState, SCREEN_STATES } from 'src/popup/screenState.js';
import { clearAutoCloseTimer } from 'src/popup/autoClose.js';

// Mock DOM elements
const mockMainScreen = { style: { display: '' } };
const mockSettingsScreen = { style: { display: 'none' } };
const mockMenuBtn = { addEventListener: jest.fn() };
const mockBackBtn = { addEventListener: jest.fn() };

// Mock document.getElementById
global.document.getElementById = jest.fn((id) => {
  switch (id) {
    case 'mainScreen': return mockMainScreen;
    case 'settingsScreen': return mockSettingsScreen;
    case 'menuBtn': return mockMenuBtn;
    case 'backBtn': return mockBackBtn;
    default: return null;
  }
});

// Mock setScreenState
jest.mock('src/popup/screenState.js', async () => {
  const actual = await import('src/popup/screenState.js');
  return {
    ...actual,
    setScreenState: jest.fn()
  };
});

// Mock clearAutoCloseTimer
jest.mock('src/popup/autoClose.js', async () => {
  const actual = await import('src/popup/autoClose.js');
  return {
    ...actual,
    clearAutoCloseTimer: jest.fn()
  };
});

describe('navigation', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="mainScreen">Main Screen</div>
      <div id="settingsScreen" style="display: none;">Settings Screen</div>
      <button id="menuBtn">Menu</button>
      <button id="backBtn">Back</button>
    `;
  });

  afterEach(() => {
    // Clean up DOM
    document.body.innerHTML = '';
  });

  describe('showMainScreen', () => {
    it('should show main screen and hide settings screen', () => {
      // Get DOM elements
      const mainScreen = document.getElementById('mainScreen');
      const settingsScreen = document.getElementById('settingsScreen');
      
      // Initially settings screen is hidden
      expect(mainScreen.style.display).toBe('');
      expect(settingsScreen.style.display).toBe('none');
      
      showMainScreen();
      
      // After calling showMainScreen, main screen should be visible
      expect(mainScreen.style.display).toBe('block');
      expect(settingsScreen.style.display).toBe('none');
      expect(setScreenState).toHaveBeenCalledWith(SCREEN_STATES.MAIN);
    });

    it('should handle missing DOM elements gracefully', () => {
      // Remove settings screen from DOM
      document.getElementById('settingsScreen').remove();
      
      expect(() => {
        showMainScreen();
      }).not.toThrow();
      
      const mainScreen = document.getElementById('mainScreen');
      expect(mainScreen.style.display).toBe('block');
      expect(setScreenState).toHaveBeenCalledWith(SCREEN_STATES.MAIN);
    });
  });

  describe('showSettingsScreen', () => {
    it('should show settings screen and hide main screen', () => {
      // Get DOM elements
      const mainScreen = document.getElementById('mainScreen');
      const settingsScreen = document.getElementById('settingsScreen');
      
      showSettingsScreen();
      
      // After calling showSettingsScreen, settings screen should be visible
      expect(settingsScreen.style.display).toBe('block');
      expect(mainScreen.style.display).toBe('none');
      expect(clearAutoCloseTimer).toHaveBeenCalled();
      expect(setScreenState).toHaveBeenCalledWith(SCREEN_STATES.SETTINGS);
    });

    it('should handle missing DOM elements gracefully', () => {
      // Remove main screen from DOM
      document.getElementById('mainScreen').remove();
      
      expect(() => {
        showSettingsScreen();
      }).not.toThrow();
      
      const settingsScreen = document.getElementById('settingsScreen');
      expect(settingsScreen.style.display).toBe('block');
      expect(clearAutoCloseTimer).toHaveBeenCalled();
      expect(setScreenState).toHaveBeenCalledWith(SCREEN_STATES.SETTINGS);
    });
  });

  describe('init', () => {
    it('should initialize event listeners', () => {
      // Mock setScreenState
      setScreenState.mockResolvedValue();
      
      init();
      
      // Check if event listeners are attached
      const menuBtn = document.getElementById('menuBtn');
      const backBtn = document.getElementById('backBtn');
      
      expect(menuBtn).toBeDefined();
      expect(backBtn).toBeDefined();
      
      // Trigger click events
      const menuClickEvent = new Event('click');
      const backClickEvent = new Event('click');
      
      menuBtn.dispatchEvent(menuClickEvent);
      backBtn.dispatchEvent(backClickEvent);
      
      // Verify that the functions were called
      expect(clearAutoCloseTimer).toHaveBeenCalled();
      expect(setScreenState).toHaveBeenCalledWith(SCREEN_STATES.SETTINGS);
      expect(setScreenState).toHaveBeenCalledWith(SCREEN_STATES.MAIN);
    });

    it('should handle missing buttons gracefully', () => {
      // Remove buttons from DOM
      document.getElementById('menuBtn').remove();
      document.getElementById('backBtn').remove();
      
      expect(() => {
        init();
      }).not.toThrow();
    });
  });
});