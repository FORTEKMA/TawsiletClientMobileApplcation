import React, {useEffect} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import {getCurrentUser} from '../store/userSlice/userSlice';
import AuthStack from './AuthStack';
import DrawerNavigator from './DrawerNavigator'; // Changed from TabNavigator to DrawerNavigator
import {createStackNavigator} from '@react-navigation/stack';
import Onboarding from '../screens/Onboarding';
import Rating from "../screens/Rating"
import Login from '../screens/Login';
import ChatScreen from '../screens/ChatScreen'; // Import ChatScreen
import TrackingScreen from '../screens/TrackingScreen'; // Import TrackingScreen
import { createNavigationContainerRef } from '@react-navigation/native';
import { startTrackingUserLocation } from "../utils/userLocationTracker"

export const navigationRef = createNavigationContainerRef();

const Stack = createStackNavigator();

const MainNavigator = ({onReady}) => {
  const userIsLoggedIn = useSelector(state => state.user.token);
 const currentUser= useSelector(state => state.user);
  const dispatch = useDispatch();
  const isFirstTime = useSelector(state => state.user.isFirstTime);
  const hasReview = useSelector(state => state.user.hasReview);
  useEffect(() => {
    dispatch(getCurrentUser());
   if(currentUser?.currentUser?.documentId){
    startTrackingUserLocation(currentUser?.currentUser?.documentId);

   }
   }, []);

  return (
    <NavigationContainer ref={navigationRef} onReady={onReady}>
        <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerBackVisible: false,
        headerTitle: '',
        headerTransparent: true,
      }}>

      
    {isFirstTime==true&&(  <Stack.Screen name="onboarding" component={Onboarding} />)}
      {hasReview!=null&&(  <Stack.Screen options={{ gestureEnabled: false }}  initialParams={{ order:hasReview}}  name="Rating" component={Rating} />)}
     
      <Stack.Screen name="Main" component={DrawerNavigator} />
      <Stack.Screen name="Auth" component={AuthStack} options={{ headerShown: false }} />
      <Stack.Screen
        name="LoginModal"
        component={Login}
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureDirection: 'vertical',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
 
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default MainNavigator;


