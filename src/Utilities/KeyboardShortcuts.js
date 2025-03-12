import { useEffect } from 'react';
import { DEFAULT_KEYBINDINGS } from '../components/ToolsComponents/DefaultSettings';

// Get settings from localStorage if available
const getSettingsFromStorage = () => {
  try {
    const settingsStr = localStorage.getItem('orgChartSettings');
    console.log('Raw settings from localStorage:', settingsStr);
    
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      console.log('Parsed settings from localStorage:', settings);
      
      // Ensure keybindings exist by merging with defaults
      if (!settings.keybindings) {
        console.log('No keybindings found in settings, using defaults');
        settings.keybindings = DEFAULT_KEYBINDINGS;
      } else {
        console.log('Using keybindings from settings:', settings.keybindings);
      }
      return settings;
    }
    console.log('No settings found in localStorage, using default keybindings');
    return { keybindings: DEFAULT_KEYBINDINGS };
  } catch (error) {
    console.error('Error reading settings from localStorage:', error);
    return { keybindings: DEFAULT_KEYBINDINGS };
  }
};

export const useKeyboardShortcut = (key, ctrlKey, callback, actionId = null) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Debug information
      console.log(`KeyboardShortcuts: Key pressed: ${event.key}, Ctrl: ${event.ctrlKey}, Action ID: ${actionId || 'none'}`);
      
      // Skip if any modal is open (common modal handling)
      if (document.querySelector('.modal-open')) {
        console.log('Modal is open, skipping keyboard shortcut');
        return;
      }
      
      // Check if this key combination is defined in settings
      const settings = getSettingsFromStorage();
      console.log('Settings loaded in KeyboardShortcuts:', settings);
      
      // If we have an actionId and settings with keybindings, check if this shortcut is overridden
      if (actionId && settings?.keybindings) {
        console.log(`Checking custom binding for action: ${actionId}`);
        const customBinding = settings.keybindings[actionId];
        console.log(`Custom binding for ${actionId}:`, customBinding);
        
        if (customBinding) {
          // Parse the custom binding
          const parts = customBinding.split('+');
          const customModifier = parts[0].toUpperCase();
          const customKey = parts[1]?.toUpperCase();
          console.log(`Parsed custom binding: Modifier: ${customModifier}, Key: ${customKey}`);
          
          // Log the current key press
          console.log(`Current key press: Modifier: ${event.ctrlKey ? 'CTRL' : 'NONE'}, Key: ${event.key.toUpperCase()}`);
          
          // If this shortcut doesn't match the custom binding, don't execute
          const matchesCustomBinding = 
            (customModifier === 'CTRL' && event.ctrlKey) &&
            (customKey && event.key.toUpperCase() === customKey);
          
          console.log(`Matches custom binding: ${matchesCustomBinding}`);
            
          if (!matchesCustomBinding) {
            console.log(`Doesn't match custom binding for ${actionId}, not executing`);
            return; // Don't execute if this doesn't match the custom binding
          } else {
            console.log(`Matches custom binding for ${actionId}, will execute`);
          }
        }
      }
      
      // Check if this is the default shortcut and should be executed
      const matchesDefaultShortcut = event.key.toLowerCase() === key.toLowerCase() && event.ctrlKey === ctrlKey;
      console.log(`Matches default shortcut: ${matchesDefaultShortcut}`);
      
      if (matchesDefaultShortcut) {
        // If we have settings and this is a known action, check if it's been remapped
        if (actionId && settings?.keybindings) {
          // Get all keybindings
          const allBindings = settings.keybindings;
          console.log('All keybindings:', allBindings);
          
          // Check if any other action has been mapped to this key combination
          const conflictingAction = Object.entries(allBindings).find(([action, binding]) => {
            if (action !== actionId) {
              const parts = binding.split('+');
              const modifier = parts[0].toUpperCase();
              const bindingKey = parts[1]?.toUpperCase();
              
              const conflicts = modifier === 'CTRL' && bindingKey === event.key.toUpperCase();
              console.log(`Checking for conflict with ${action}: ${binding} - Conflicts: ${conflicts}`);
              return conflicts;
            }
            return false;
          });
          
          // If another action has been mapped to this key, don't execute
          if (conflictingAction) {
            console.log(`Skipping default action for ${key} because it's been remapped to ${conflictingAction[0]}`);
            return;
          }
        }
        
        console.log(`Executing callback for ${actionId || 'unnamed action'} with key ${key}`);
        event.preventDefault();
        callback();
      } else {
        console.log(`Not executing callback for ${actionId || 'unnamed action'} - doesn't match the key combination`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, ctrlKey, callback, actionId]);
};