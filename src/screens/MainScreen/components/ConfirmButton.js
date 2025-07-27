import React from 'react';
import {Pressable, Text, StyleSheet} from 'react-native';
import {styles} from '../styles';
import { colors } from '../../../utils/colors';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const ConfirmButton = ({onPress, text, disabled}) => {
  return (
    <Pressable 
      disabled={disabled} 
      style={[localStyles.confirmButton, {opacity: disabled ? 0.6 : 1}]} 
      onPress={onPress}
    >
      <Text style={localStyles.confirmButtonText}>{text}</Text>
    </Pressable>
  );
};

const localStyles = StyleSheet.create({
  confirmButton: {
    backgroundColor: colors.uberBlack,
    paddingVertical: hp(2),
    paddingHorizontal: wp(8),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.uberBlack,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: hp(6),
  },
  confirmButtonText: {
    color: colors.textInverse,
    fontSize: hp(2),
    fontWeight: '700',
  },
});

export default ConfirmButton;

