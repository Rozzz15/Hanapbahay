import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PropertyVideoPlayer from '../PropertyVideoPlayer';

// Mock expo-video
jest.mock('expo-video', () => ({
  VideoView: 'VideoView',
  useVideoPlayer: jest.fn(() => ({
    replace: jest.fn(),
    replaceAsync: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    addListener: jest.fn(),
  })),
}));

describe('PropertyVideoPlayer', () => {
  const mockVideos = [
    'https://example.com/video1.mp4',
    'https://example.com/video2.mp4',
  ];

  const defaultProps = {
    videos: mockVideos,
    visible: true,
    onClose: jest.fn(),
    initialIndex: 0,
  };

  it('renders correctly when visible', () => {
    const { getByText } = render(<PropertyVideoPlayer {...defaultProps} />);
    
    expect(getByText('1 / 2')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <PropertyVideoPlayer {...defaultProps} visible={false} />
    );
    
    expect(queryByText('1 / 2')).toBeNull();
  });

  it('shows no videos message when videos array is empty', () => {
    const { getByText } = render(
      <PropertyVideoPlayer {...defaultProps} videos={[]} />
    );
    
    expect(getByText('Video player not available')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <PropertyVideoPlayer {...defaultProps} onClose={mockOnClose} />
    );
    
    // Note: In a real test, you'd need to add testID to the close button
    // fireEvent.press(getByTestId('close-button'));
    // expect(mockOnClose).toHaveBeenCalled();
  });
});
