import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type FormControlSize = 'sm' | 'md' | 'lg';

interface FormControlProps {
  size?: FormControlSize;
  children?: React.ReactNode;
  style?: any;
}

const FormControl = React.forwardRef<View, FormControlProps>(
  ({ size = 'md', children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.formControl, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

interface FormControlLabelProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlLabel = React.forwardRef<View, FormControlLabelProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.label, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

interface FormControlLabelTextProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlLabelText = React.forwardRef<Text, FormControlLabelTextProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        style={[styles.labelText, style]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

interface FormControlLabelAstrickProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlLabelAstrick = React.forwardRef<Text, FormControlLabelAstrickProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        style={[styles.labelAstrick, style]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

interface FormControlErrorProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlError = React.forwardRef<View, FormControlErrorProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.error, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

interface FormControlErrorTextProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlErrorText = React.forwardRef<Text, FormControlErrorTextProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        style={[styles.errorText, style]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

interface FormControlErrorIconProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlErrorIcon = React.forwardRef<View, FormControlErrorIconProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.errorIcon, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

interface FormControlHelperProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlHelper = React.forwardRef<View, FormControlHelperProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[styles.helper, style]}
        {...props}
      >
        {children}
      </View>
    );
  }
);

interface FormControlHelperTextProps {
  children?: React.ReactNode;
  style?: any;
}

const FormControlHelperText = React.forwardRef<Text, FormControlHelperTextProps>(
  ({ children, style, ...props }, ref) => {
    return (
      <Text
        ref={ref}
        style={[styles.helperText, style]}
        {...props}
      >
        {children}
      </Text>
    );
  }
);

const styles = StyleSheet.create({
  formControl: {
    flexDirection: 'column',
  },
  label: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelText: {
    fontWeight: '500',
    color: '#1f2937',
    fontSize: 16,
  },
  labelAstrick: {
    fontWeight: '500',
    color: '#1f2937',
    fontSize: 16,
  },
  error: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  errorIcon: {
    width: 16,
    height: 16,
  },
  helper: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 14,
  },
});

FormControl.displayName = 'FormControl';
FormControlError.displayName = 'FormControlError';
FormControlErrorText.displayName = 'FormControlErrorText';
FormControlErrorIcon.displayName = 'FormControlErrorIcon';
FormControlLabel.displayName = 'FormControlLabel';
FormControlLabelText.displayName = 'FormControlLabelText';
FormControlLabelAstrick.displayName = 'FormControlLabelAstrick';
FormControlHelper.displayName = 'FormControlHelper';
FormControlHelperText.displayName = 'FormControlHelperText';

export {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlErrorIcon,
  FormControlLabel,
  FormControlLabelText,
  FormControlLabelAstrick,
  FormControlHelper,
  FormControlHelperText,
};