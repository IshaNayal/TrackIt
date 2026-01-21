import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '../hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor(
  {
    light: lightColor ?? '#fff',
    dark: darkColor ?? '#000000',
  },
  'background'
);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
