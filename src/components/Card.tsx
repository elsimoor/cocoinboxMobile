import React from 'react';
import { View, ViewProps } from 'react-native';

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  return (
    <View
      style={[
        {
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 18,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          borderColor: '#e4e4e7',
          borderWidth: 1,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};
