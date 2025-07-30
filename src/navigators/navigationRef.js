import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();
const navigationQueue = [];

/**
 * Navigate to a specific route.
 * If the navigation container is not ready, queue the action.
 * @param {string} name - The name of the route.
 * @param {object} params - The parameters for the route.
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  } else {
    navigationQueue.push({ type: 'navigate', name, params });
  }
}

/**
 * Reset the navigation state to a specific route.
 * If the navigation container is not ready, queue the action.
 * @param {string} name - The name of the route.
 * @param {object} params - The parameters for the route.
 */
export function reset(name, params = {}) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 1,
      routes: [{ name, params }],
    });
  } else {
    navigationQueue.push({ type: 'reset', name, params });
  }
}

/**
 * Reset the navigation state to a nested set of routes.
 * If the navigation container is not ready, queue the action.
 * @param {Array} routes - The nested routes to reset to.
 */
export function resetToNest(routes) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 1,
      routes,
    });
  } else {
    navigationQueue.push({ type: 'resetToNest', routes });
  }
}

/**
 * Process the queued navigation actions.
 * Call this function when the navigation container is ready.
 */
export function processNavigationQueue() {
  if (navigationQueue.length === 0) return;

  // Filter and remove duplicates from the queue
  const filteredQueue = [];
  const seenActions = new Set();

  for (const action of navigationQueue) {
    // Create a unique key for each action type
    let actionKey;
    if (action.type === 'navigate') {
      actionKey = `navigate:${action.name}`;
    } else if (action.type === 'reset') {
      actionKey = `reset:${action.name}`;
    } else if (action.type === 'resetToNest') {
      // For resetToNest, use the first route name as key
      const firstRouteName = action.routes[0]?.name || 'unknown';
      actionKey = `resetToNest:${firstRouteName}`;
    }

    // Only add if we haven't seen this action before
    if (!seenActions.has(actionKey)) {
      seenActions.add(actionKey);
      filteredQueue.push(action);
    }
  }

  // Clear the original queue
  navigationQueue.length = 0;

  // Process the filtered queue
  for (const action of filteredQueue) {
    if (action.type === 'navigate') {
      navigationRef.navigate(action.name, action.params);
    } else if (action.type === 'reset') {
      navigationRef.reset({
        index: 1,
        routes: [{ name: action.name, params: action.params }],
      });
    } else if (action.type === 'resetToNest') {
      navigationRef.reset({
        index: 1,
        routes: action.routes,
      });
    }
  }
}

/**
 * Get the current route.
 * @returns {object|null} The current route or null if not ready.
 */
export function getCurrentRoute() {
  return navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
}