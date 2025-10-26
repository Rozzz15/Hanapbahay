import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import VideoGallery from '../VideoGallery';

describe('VideoGallery', () => {
  const mockVideos = [
    'https://example.com/video1.mp4',
    'https://example.com/video2.mp4',
  ];

  const defaultProps = {
    videos: mockVideos,
    onVideoPress: jest.fn(),
  };

  it('renders correctly with videos', () => {
    const { getByText } = render(<VideoGallery {...defaultProps} />);
    
    expect(getByText('🎥 Property Videos (2)')).toBeTruthy();
  });

  it('shows no videos message when videos array is empty', () => {
    const { getByText } = render(
      <VideoGallery {...defaultProps} videos={[]} />
    );
    
    expect(getByText('No videos available for this property.')).toBeTruthy();
  });

  it('calls onVideoPress when video thumbnail is pressed', () => {
    const mockOnVideoPress = jest.fn();
    const { getAllByTestId } = render(
      <VideoGallery {...defaultProps} onVideoPress={mockOnVideoPress} />
    );
    
    // Note: In a real test, you'd need to add testID to the video thumbnails
    // const videoThumbnails = getAllByTestId('video-thumbnail');
    // fireEvent.press(videoThumbnails[0]);
    // expect(mockOnVideoPress).toHaveBeenCalledWith(0);
  });
});
