import React, { useEffect, useRef, useState } from 'react'
import { Text, View, Animated, Easing, StyleSheet } from 'react-native'

const WaitingForTranscript = () => {
  const [dots, setDots] = useState('');
  const opacityAnim = useRef(new Animated.Value(0.4)).current;
  
  useEffect(() => {
    // Animation for the opacity pulsing effect (skeleton-like)
    const pulseAnimation = Animated.sequence([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.4,
        duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true
      })
    ]);

    // Start the animation loop
    Animated.loop(pulseAnimation).start();
    
    // Animation for the dots
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    return () => {
      clearInterval(dotsInterval);
      opacityAnim.stopAnimation();
    };
  }, []);
  
  return (
    <View style={styles.container}>
      <Animated.Text 
        style={[
          styles.text,
          { opacity: opacityAnim }
        ]}
      >
        Waiting for transcript{dots}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  }
});

export default WaitingForTranscript