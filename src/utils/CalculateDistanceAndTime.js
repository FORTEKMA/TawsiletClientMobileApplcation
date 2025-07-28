import axios from 'axios';
import api from './api';
import { API_GOOGLE } from "@env";
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function calculateDistanceAndTime(startCoords, endCoords) {
  const apiKey = API_GOOGLE;

  // Try Directions API first
  const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${startCoords.latitude},${startCoords.longitude}&destination=${endCoords.latitude},${endCoords.longitude}&key=${apiKey}&language=fr`;
  
  try {
    const response = await axios.get(directionsUrl);

    const distance = response.data.routes[0].legs[0].distance.value;
    const duration = response.data.routes[0].legs[0].duration.text.trim();

    return {
      distance: distance,
      time: duration,
    };
  } catch (error) {
    console.error('Directions API failed, trying Distance Matrix API:', error);
    
    // Fallback to Distance Matrix API
    try {
      const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${startCoords.latitude},${startCoords.longitude}&destinations=${endCoords.latitude},${endCoords.longitude}&key=${apiKey}&units=metric`;
      
      const matrixResponse = await axios.get(distanceMatrixUrl);
      
      if (matrixResponse.data.status === 'OK' && matrixResponse.data.rows[0]?.elements[0]?.status === 'OK') {
        const element = matrixResponse.data.rows[0].elements[0];
        return {
          distance: element.distance.value,
          time: element.duration.text,
        };
      }
    } catch (matrixError) {
      console.error('Distance Matrix API also failed:', matrixError);
    }
    
    return null;
  }
}

import {ONESIGNAL_DRIVER_APP_ID,ONESIGNAL_DRIVER_APP_API_KEY} from '@env';
 
export const sendNotificationToDrivers = async (
 { driver,
  formData,
  currentUser,}
 
) => {
     // Prepare ride info
    const rideInfo = {
      type: "new_command",
      from: formData.pickupAddress.address,
      coordonneFrom: {
        longitude: formData.pickupAddress.longitude,
        latitude: formData.pickupAddress.latitude,
      },
      coordonneTo: {
        longitude: formData.dropAddress.longitude,
        latitude: formData.dropAddress.latitude,
      },
      to: formData.dropAddress.address,
      time: formData.time||Date.now(),
      price: formData.price,
      currentUser: {
        "id": currentUser.id,
"documentId": currentUser.documentId,
 
 
"phoneNumber": currentUser.phoneNumber,
"firstName":currentUser.firstName,
"lastName": currentUser.lastName,
 
"rating": currentUser.rating,
 
      },
      distanceBetweenPickupAndDropoff: formData.distance,
      driverPosition: '',
    };

 

   return axios.post(
        'https://onesignal.com/api/v1/notifications',
        {
          app_id: ONESIGNAL_DRIVER_APP_ID,
           
          "include_aliases": {
    "external_id": [ String(driver.id) ]
  },
    "target_channel": "push",
          headings: {en: 'Nouveau trajet'},
          contents: {
            en: 'Vous avez une nouvelle demande de course !',
            ar: 'لديك طلب رحلة جديد!',
          },
          "mutable_content": true,
"android_channel_id": 'ec037fdf-e9b4-4020-babd-181a1dd77ad4',
"android_accent_color":"0c0c0c",
"ios_badgeType": "Increase",
"ios_badgeCount": 1,
          priority: 10,
          data: rideInfo,
        
        },
        {
          headers: {
            Authorization: `Basic ${ONESIGNAL_DRIVER_APP_API_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      );

       

  
};

export const calculatePrice = async (formData,driver=null) => {
  console.log("formData",formData);
  const data={
    
    "accessDepart": {
      "lat": formData.pickupAddress.latitude,
      "lng": formData.pickupAddress.longitude
    },
    "accessArrivee": {
      "lat": formData.dropAddress.latitude,
      "lng": formData.dropAddress.longitude
    },
    "id":formData?.vehicleType?.id,
    "selectedDate":formData?.selectedDate
  }

  if(driver){
    data.driverLocation={
      "lat": driver.latitude,
      "lng": driver.longitude
    }
  }
 
  const response = await api.post('/calcul',data);
  console.log("response",response.data);

   return response.data;
}

export const sendActionToDrivers = async (driverID, replay="") => {
  

  return axios.post(
    'https://onesignal.com/api/v1/notifications',
    {
      app_id: ONESIGNAL_DRIVER_APP_ID,
      include_player_ids: [driverID],
      headings: {en: 'New Ride'},
      contents: {
        en: 'You have a new ride request!',
        ar: 'لديك طلب رحلة جديد!',
      },
      priority: 10,
      "mutable_content": true,
      "android_channel_id": 'ec037fdf-e9b4-4020-babd-181a1dd77ad4',
      "android_accent_color":"0c0c0c",
      "ios_badgeType": "Increase",
      "ios_badgeCount": 1,
      data: {
  
        type:replay
      },
    },
    {
      headers: {
        Authorization: `Basic ${ONESIGNAL_DRIVER_APP_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );



}