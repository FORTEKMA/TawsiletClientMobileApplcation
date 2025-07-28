import React, { useEffect, useRef, useState } from 'react';
import { Polyline } from 'react-native-maps';

const getDistance = (p1, p2) => {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(p2.latitude - p1.latitude);
  const dLon = toRad(p2.longitude - p1.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.latitude)) *
      Math.cos(toRad(p2.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const AnimatedPolyline = ({ coords = [], speed = 20, progress, loop = true }) => {
  const [animatedSegment, setAnimatedSegment] = useState([]);
  const timeoutRef = useRef(null);
  const animationProgress = useRef(0);

  const animate = () => {
    if (coords.length < 2) return;

    // Calculate the current position based on progress
    const totalLength = coords.length;
    const currentIndex = Math.floor(animationProgress.current * totalLength);
    
    // Create a segment that shows the progress (from start to current position)
    const segment = coords.slice(0, currentIndex + 1);
    setAnimatedSegment(segment);

    // Calculate dynamic speed based on array length
    // Longer arrays get faster animation, shorter arrays get slower animation
    const baseSpeed = speed;
    const lengthFactor = Math.max(0.5, Math.min(3, totalLength / 20)); // Scale factor between 0.5x and 3x
    const dynamicSpeed = Math.max(10, Math.floor(baseSpeed / lengthFactor)); // Minimum 10ms, maximum based on base speed

    // Increment progress with larger steps for faster animation
    animationProgress.current += 0.02; // Increased from 0.005 to 0.02 for much faster animation

    // Check if animation is complete
    if (animationProgress.current >= 1) {
      if (loop) {
        // Reset and restart animation
        animationProgress.current = 0;
        // Add a small delay before restarting to prevent flickering
        timeoutRef.current = setTimeout(animate, 50); // Reduced restart delay
      }
      // If not looping, animation stops here
    } else {
      // Continue animation with dynamic speed
      timeoutRef.current = setTimeout(animate, dynamicSpeed);
    }
  };

  useEffect(() => {
    if (coords.length > 2) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Reset animation when coords change
      animationProgress.current = 0;
      setAnimatedSegment([]);
      
      // Start the animation
      animate();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [coords]);

  // Optional: Use external progress prop if provided
  useEffect(() => {
    if (typeof progress === 'number' && progress >= 0 && progress <= 1) {
      // Clear animation when external progress is used
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      const totalLength = coords.length;
      const currentIndex = Math.floor(progress * totalLength);
      const segment = coords.slice(0, currentIndex + 1);
      setAnimatedSegment(segment);
    }
  }, [progress, coords]);

  return animatedSegment.length > 1 ? (
    <Polyline
      coordinates={animatedSegment}
      strokeWidth={3}
      strokeColor="#000"
      lineCap="round"
      lineJoin="round"
      style={{ zIndex: 1000 }}
    />
  ) : null;
};

export default AnimatedPolyline;
