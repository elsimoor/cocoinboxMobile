import React from 'react';
import { View, ViewProps } from 'react-native';

export const GlassCard: React.FC<ViewProps> = ({ style, children, ...rest }) => {
  return (
    <View
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: 18,
          padding: 18,
          borderColor: 'rgba(226,232,240,0.8)',
          borderWidth: 1,
          shadowColor: '#0ea5e9',
          shadowOpacity: 0.15,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};
