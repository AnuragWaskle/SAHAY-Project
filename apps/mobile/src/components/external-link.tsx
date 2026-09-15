import React from 'react';
import { TouchableOpacity, Text, Linking } from 'react-native';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, ...rest }: Props) {
  return (
    <TouchableOpacity
      {...rest}
      onPress={async () => {
        try {
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        } catch {
          await Linking.openURL(href);
        }
      }}
    >
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </TouchableOpacity>
  );
}
