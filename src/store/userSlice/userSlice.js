import AsyncStorage from '@react-native-async-storage/async-storage';
import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import api from '../../utils/api';
import { OneSignal } from "react-native-onesignal";
import { Toast } from "native-base";
import i18n from "../../local"
import { identify, Identify, setUserId } from '@amplitude/analytics-react-native';
import { startTrackingUserLocation, stopTrackingUserLocation } from '../../utils/userLocationTracker';

// Utility function to update Amplitude user properties for profile updates
const updateAmplitudeUserProfile = (user) => {
  if (!user) return;
  
  try {
    const identifyObj = new Identify();
    
    // Update profile-specific properties
    identifyObj.set('first_name', user.firstName || '');
    identifyObj.set('last_name', user.lastName || '');
    identifyObj.set('email', user.email || '');
    identifyObj.set('phone_number', user.phoneNumber || '');
    identifyObj.set('username', user.username || '');
    identifyObj.set('has_profile_picture', !!user.profilePicture);
    identifyObj.set('profile_updated_at', new Date().toISOString());
    
    // Add to profile update counter
    identifyObj.add('profile_update_count', 1);
    
    // Send the identify call
    identify(identifyObj);
    
    console.log('Amplitude user profile updated successfully');
  } catch (error) {
    console.error('Error updating Amplitude user profile:', error);
  }
};

// Utility function to set Amplitude user properties
const setAmplitudeUserProperties = (user) => {
  if (!user) return;
  
  try {
    // Set user ID
     
    if(!user?.documentId) return
    
    setUserId(String(user.documentId));

    
    // Create identify object for user properties
    const identifyObj = new Identify();
    // Set user properties
    identifyObj.set('user_id', user.documentId);
    identifyObj.set('email', user.email || '');
    identifyObj.set('phone_number', user.phoneNumber || '');
    identifyObj.set('first_name', user.firstName || '');
    identifyObj.set('last_name', user.lastName || '');
    identifyObj.set('username', user.username || '');
    identifyObj.set('user_role', user.user_role || '');
    identifyObj.set('is_blocked', user.blocked || false);
    identifyObj.set('has_profile_picture', !!user.profilePicture);
    identifyObj.set('registration_date', user.createdAt || '');
    identifyObj.set('last_login', new Date().toISOString());
    identifyObj.set('is_guest', user?.id==undefined);
    identifyObj.set('provider', user.provider || 'email');
    
    
    // Add to counters
    identifyObj.add('login_count', 1);
    identifyObj.add('total_sessions', 1);
    
    // Add to arrays for tracking
    if (user.provider) {
      identifyObj.append('login_methods_used', user.provider);
    }
    
    // Send the identify call
    identify(identifyObj);
    
   } catch (error) {
    console.error('Error setting Amplitude user properties:', error);
  }
};

// Utility function to clear Amplitude user properties on logout
const clearAmplitudeUserProperties = () => {
  try {
    setUserId(null);
    console.log('Amplitude user properties cleared successfully');
  } catch (error) {
    console.error('Error clearing Amplitude user properties:', error);
  }
};

export const userRegister = createAsyncThunk('user/register', async user => {
  try {
    // Handle the user registration logic here
    if (user?.user?.blocked) {
      Toast.show({
        title: i18n.t('auth.invalid_account'),
        description: i18n.t('auth.account_blocked'),
        placement: "top",
        status: "error",
        duration: 3000
      });
      return { error: 'blocked', user: user.user };
    }
    
    if (user?.user?.user_role !== 'client') {
      Toast.show({
        title: i18n.t('auth.invalid_account'),
        description: i18n.t('auth.account_not_for_app'),
        placement: "top",
        status: "error",
        duration: 3000
      });
      return { error: 'invalid_role', user: user.user };
    }
    
    return user;
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'unknown', message: error.message };
  }
});

export const userLogin = createAsyncThunk('user/login', async login => {
  try {
   
    let response = await api.post(`/auth/local`, login);
    
    OneSignal.login(String(response.data.user.id));

    // Handle error cases in the async thunk
    if (response.data?.user?.blocked) {
      Toast.show({
        title: i18n.t('auth.invalid_account'),
        description: i18n.t('auth.account_blocked'),
        placement: "top",
        status: "error",
        duration: 3000
      });
      return { error: 'blocked', user: response.data.user };
    }
    
    if (response.data?.user?.user_role !== 'client') {
      Toast.show({
        title: i18n.t('auth.invalid_account'),
        description: i18n.t('auth.account_not_for_app'),
        placement: "top",
        status: "error",
        duration: 3000
      });
      return { error: 'invalid_role', user: response.data.user };
    }

    return response.data;
    
  } catch (error) {
    console.log("error",error)
    return {error:true};
  }
});

export const getCurrentUser = createAsyncThunk(
  'user/current',
  async (_, thunkAPI) => {
    // Removed the 'thunkAPI' parameter
    try {
      const state = thunkAPI.getState();
      const jwt = state.user.token; // Access the token from the 'user' slice
      
      if (jwt&&jwt!=-1) {
        const response = await api.get(`/users/me?populate=*`);
        return response.data;
      }
    } catch (error) {
      console.error('current user error:', error);
      throw error;
    }
  },
);
export const logOut = createAsyncThunk('user/logout', async thunkApi => {
  try {
    await AsyncStorage.removeItem('token');
  } catch (error) {
    console.log(error);
  }
});
export const sendVerify = createAsyncThunk(
  'user/sendverify',
  async (data) => {
  console.log("data",data)
    try {
      let response = await api.post(`/codes/send-OTP`, data);
      console.log("response",response.data)
      return response.data;
    } catch (error) {
      console.log(error, 'send');
    }
  },
);

export const verify = createAsyncThunk(
  'user/verify',
  async ({phoneNumber, code}) => {
    try {
      let response = await api.post(`/verify-code`, {
        phoneNumber: phoneNumber,
        code: code,
      });

      // Handle error cases in the async thunk
      if (response.data?.user?.blocked) {
        Toast.show({
          title: i18n.t('auth.invalid_account'),
          description: i18n.t('auth.account_blocked'),
          placement: "top",
          status: "error",
          duration: 3000
        });
        return { error: 'blocked', user: response.data.user };
      }
      
      if (response.data?.user_role !== 'client') {
        Toast.show({
          title: i18n.t('auth.invalid_account'),
          description: i18n.t('auth.account_not_for_app'),
          placement: "top",
          status: "error",
          duration: 3000
        });
        return { error: 'invalid_role', user: response.data.user };
      }

      return response.data;
    } catch (error) {
      console.log(error);
      return { error: 'unknown', message: error.message };
    }
  },
);

export const uplaodImage = createAsyncThunk(
  'user/upload',
  async (data, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const jwt = state.user.token;
      let response = await api.post(`/upload`, data);
     
      return response.data;
    } catch (error) {}
  },
);
export const updateUser = createAsyncThunk(
  'user/update',
  async (newUser, thunkAPI) => {
    try {
      const state = thunkAPI.getState();
      const jwt = state.user.token;
      let response = await api.put(
        `/users/${newUser.id}`,
        newUser);
    
      return await response.data;
    } catch (error) {
      throw error;
    }
  },
);

export const changePassword = createAsyncThunk(
  'user/changepassword',
  async (credentials, thunkAPI) => {
    const state = thunkAPI.getState();
    const token = state.user.token;
 

    try {
      const response = await api.post(
        `/auth/change-password`,
        credentials );
 
      return response.data;
    } catch (error) {
      console.error('Change password error:', error); // Debugging: Log the error
      throw error;
    }
  },
);
 
export const forgetPassword = createAsyncThunk(
  'user/forgetPassword',
  async email => {
    try {
      const response = await api.post(
        `/codes/forgot-password`,
        {
          email: email,
        },
      );
      return response.data;
    } catch (error) {
      throw error; // Add this line to propagate the error up to the component
    }
  },
);

export const resetPassword = createAsyncThunk(
  'user/resetPassword',
  async data => {
    try {
      let response = await api.post(`/codes/reset-password`, data);

      return response.data;
    } catch (error) {
      console.log(error.response)
      throw error
    }
  },
);
export const setEmailForgetPassword = createAsyncThunk(
  'forgetpswd/setEmail',
  async (body, thunkAPI) => {
    return body;
  },
);
const initialState = {
  user: null,
  currentUser: null,
  code: null,
  token: null,
  waitingToken: null,
  status: null,
  message: '',
  forgetPsw: null,
  refresh: false,
  isFirstTime: true,
  email:null,
  hasReview:null,
  rememberMe: false,
  rememberedIdentifier: null,
};



export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setRememberMe: (state, action) => {
      state.rememberMe = action.payload.remember;
      state.rememberedIdentifier = action.payload.identifier;
    },
    setToken: (state, action) => {
      state.user.token = action.payload;
    },
    updateIsFirstTime: (state, action) => {
      state.isFirstTime = action.payload;
    },
    updateOffllineProfile:(state,action)=>{
   
      state.user.user={...state.user.user,...action.payload}
    },
    updateHasReview:(state,action)=>{
    
      state.hasReview=action.payload
    },

  },
  extraReducers: (builder) => {
    builder
      .addCase(changePassword.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.status = 'success';
        if (action.payload.user.user_role === 'client') {
          // state.currentUser = action.payload.user;
          state.token = action.payload.jwt;
        }
        state.isLoading = false;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(forgetPassword.pending, (state) => {
        state.status = 'pending';
        // state.isLoading = true;
      })
      .addCase(forgetPassword.fulfilled, (state, action) => {
        state.status = 'success';
        state.forgetPsw = action.payload;
        // state.isLoading = false;
      })
      .addCase(forgetPassword.rejected, (state) => {
        state.status = 'fail';
        // state.isLoading = false;
      })
      .addCase(setEmailForgetPassword.pending, (state) => {
        state.status = 'pending';
        // state.isLoading = true;
      })
      .addCase(setEmailForgetPassword.fulfilled, (state, action) => {
        state.status = 'success';
        state.email = action.payload;
        // state.isLoading = false;
      })
      .addCase(setEmailForgetPassword.rejected, (state) => {
        state.status = 'fail';
        // state.isLoading = false;
      })
      .addCase(resetPassword.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;
      })
      .addCase(resetPassword.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(userRegister.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(userRegister.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;
        
        // Handle error cases
        if (action.payload.error) {
          state.status = 'fail';
          if (action.payload.error === 'blocked') {
            state.message = 'This account is blocked. Please contact support.';
          } else if (action.payload.error === 'invalid_role') {
            state.message = 'This account is not for this app.';
          } else {
            state.message = action.payload.message || 'Registration failed';
          }
          return;
        }
        
        // Handle successful registration
        if (action.payload.jwt && action?.payload?.user?.user_role === 'client') {
          state.token = action.payload.jwt;
          state.currentUser = action.payload.user;
          
          // Set Amplitude user properties after successful registration
          setAmplitudeUserProperties(action.payload.user);
          // Start location tracking after registration
          if (action.payload.user.documentId) {
            startTrackingUserLocation(action.payload.user.documentId);
          }
        } else if (action.payload.jwt === -1 && action?.payload?.user?.user_role === 'client') {
          // Handle guest user
          state.token = action.payload.jwt;
          state.currentUser = action.payload.user;
          
          // Set Amplitude user properties for guest user
          const guestUser = {
            ...action.payload.user,
            id: 'guest',
            documentId: 'guest',
            is_guest: true
          };
          setAmplitudeUserProperties(guestUser);
          // Optionally, do not track guest users
        }
      })
      .addCase(userRegister.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(updateUser.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;
        
        // Update Amplitude user properties when user profile is updated
        if (action.payload) {
          updateAmplitudeUserProfile(action.payload);
        }
      })
      .addCase(updateUser.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(userLogin.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(userLogin.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;
        
        // Handle error cases
        if (action.payload.error) {
          state.status = 'fail';
          if (action.payload.error === 'blocked') {
            state.message = 'This account is blocked. Please contact support.';
          } else if (action.payload.error === 'invalid_role') {
            state.message = 'This account is not for this app.';
          } else {
            state.message = action.payload.message || 'Login failed';
          }
          return;
        }
        
        // Handle successful login
        if (action?.payload?.user?.user_role === 'client') {
          state.token = action.payload.jwt;
          state.currentUser = action.payload.user;
          if (state.rememberMe) {
            AsyncStorage.setItem('rememberedIdentifier', action.payload.user.email);
            AsyncStorage.setItem('rememberMe', 'true');
          } else {
            AsyncStorage.removeItem('rememberedIdentifier');
            AsyncStorage.removeItem('rememberMe');
          }
          
          setAmplitudeUserProperties(action.payload.user);
          // Start location tracking after login
          if (action.payload.user.documentId) {
            startTrackingUserLocation(action.payload.user.documentId);
          }
        }
      })
      .addCase(userLogin.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(verify.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(verify.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;

        // Handle error cases
        if (action.payload.error) {
          state.status = 'fail';
          if (action.payload.error === 'blocked') {
            state.message = 'This account is blocked. Please contact support.';
          } else if (action.payload.error === 'invalid_role') {
            state.message = 'This account is not for this app.';
          } else {
            state.message = action.payload.message || 'Verification failed';
          }
          return;
        }

        state.user = action.payload.user;

        if (action.payload.authToken && action?.payload?.user_role === 'client') {
          state.token = action.payload.authToken;
          state.user = action.payload;
          state.currentUser = action.payload.user;
          
          // Set Amplitude user properties after successful OTP verification
          setAmplitudeUserProperties(action.payload.user);
        }
        state.status = action.payload.status;
      })
      .addCase(verify.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(sendVerify.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(sendVerify.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;
       
      })
      .addCase(sendVerify.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(getCurrentUser.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.status = 'success';
        state.isLoading = false;
        state.currentUser = action.payload;
        
        // Set Amplitude user properties when current user is fetched
        setAmplitudeUserProperties(action.payload);
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      })
      .addCase(logOut.pending, (state) => {
        state.status = 'pending';
        state.isLoading = true;
      })
      .addCase(logOut.fulfilled, (state) => {
        state.status = 'success';
        state.isLoading = false;
        state.currentUser = null;
        state.token = null;
        state.user = null
         // Clear Amplitude user properties on logout
        clearAmplitudeUserProperties();
        // Stop location tracking on logout
        stopTrackingUserLocation();
      })
      .addCase(logOut.rejected, (state) => {
        state.status = 'fail';
        state.isLoading = false;
      });
  },
});

export default userSlice.reducer;
export const {
  setToken,
  updateIsFirstTime,
  updateOffllineProfile,
  updateHasReview,
  setRememberMe
} = userSlice.actions;
