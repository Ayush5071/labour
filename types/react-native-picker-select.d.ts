declare module 'react-native-picker-select' {
  import * as React from 'react';
  import { TextStyle, ViewStyle } from 'react-native';

  type Item = { label: string; value: any; key?: string | number };

  interface Props {
    onValueChange?: (value: any, index?: number) => void;
    items?: Item[];
    value?: any;
    placeholder?: { label?: string; value?: any; color?: string };
    style?: {
      inputIOS?: TextStyle;
      inputAndroid?: TextStyle;
      placeholder?: TextStyle;
      [k: string]: any;
    };
    useNativeAndroidPickerStyle?: boolean;
    pointerEvents?: any;
    doneText?: string;
    hideDoneBar?: boolean;
    disabled?: boolean;
    [k: string]: any;
  }

  export default class RNPickerSelect extends React.Component<Props> {}
}
