import axios from 'axios';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { API_URL,IN_DEV,DEV_API_URL } from '@env';

 import { OneSignal } from "react-native-onesignal";
 
// Remove direct store import to break circular dependency
// import store from '../store';
// import {
//   logOut,
// } from "../store/userSlice/userSlice"

let api = axios.create({
  baseURL:IN_DEV=="true"   ?DEV_API_URL: API_URL,

  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

// Store reference to be set later
let storeRef = null;

// Function to set store reference
export const setStoreReference = (store) => {
  storeRef = store;
};

// Function to get current user data
const getCurrentUserData = () => {
  if (!storeRef) return null;
  try {
    const state = storeRef.getState();
    return state.user;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Function to dispatch logout action
const dispatchLogout = () => {
  if (!storeRef) return;
  try {
    // Import dynamically to avoid circular dependency
    const { logOut } = require('../store/userSlice/userSlice');
    storeRef.dispatch(logOut()).then(() => {
      OneSignal.logout();
    });
  } catch (error) {
    console.error('Error dispatching logout:', error);
  }
};

api.interceptors.request.use(
  async config => {
    const userData = getCurrentUserData();
    const token = userData && userData.token && userData.token !== -1 ? userData.token : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

// Add response interceptor to handle 401 unauthorized responses
api.interceptors.response.use(
  response => response,
  error => {
    const userData = getCurrentUserData();
    const token = userData && userData.token ? userData.token : null;
   
    if (error.response && error.response.status === 401 && token !== -1) {
      try {
        GoogleSignin.signOut();
      } catch (error) {
        console.log(error)
      }
   
      dispatchLogout();
    }
    return Promise.reject(error);
  }
);

export default api;
