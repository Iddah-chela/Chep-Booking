import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, X, Loader, Link2, Image, Video } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PostVacancy() {
  const { axios, getToken, navigate } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaType, setMediaType] = useState('photo');
  const [formData, setFormData] = useState({
    location: {
      area: '',
      city: '',
    },
    rent: {
      min: '',
      max: '',
    },
    roomType: 'single',
    availableRooms: '1',
    description: '',
    moveInDate: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleAddAmenity = () => {
    if (amenityInput.trim() && !amenities.includes(amenityInput.trim())) {
      setAmenities([...amenities, amenityInput.trim()]);
      setAmenityInput('');
    }
  };

  const handleRemoveAmenity = (index) => {
    setAmenities(amenities.filter((_, i) => i !== index));
  };

  const handleAddMedia = () => {
    if (!mediaInput.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(mediaInput);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (mediaType === 'photo') {
      if (photos.length >= 5) {
        toast.error('Maximum 5 photos allowed');
        return;
      }
      setPhotos([...photos, mediaInput.trim()]);
    } else {
      if (videos.length >= 3) {
        toast.error('Maximum 3 videos allowed');
        return;
      }
      setVideos([...videos, mediaInput.trim()]);
    }

    setMediaInput('');
    toast.success(`${mediaType} added successfully`);
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Validation
      if (!formData.location.area || !formData.location.city) {
        toast.error('Please fill in location details');
        return;
      }

      if (!formData.rent.min || !formData.rent.max) {
        toast.error('Please fill in rent range');
        return;
      }

      if (parseInt(formData.rent.min) > parseInt(formData.rent.max)) {
        toast.error('Minimum rent cannot be greater than maximum rent');
        return;
      }

      if (!formData.availableRooms || parseInt(formData.availableRooms) < 1) {
        toast.error('Available rooms must be at least 1');
        return;
      }

      setLoading(true);
      const token = await getToken();

      const payload = {
        ...formData,
        rent: {
          min: parseInt(formData.rent.min),
          max: parseInt(formData.rent.max),
        },
        availableRooms: parseInt(formData.availableRooms),
        amenities,
        photos: photos.map(url => ({ url, publicId: '' })),
        videos: videos.map(url => ({ url, publicId: '', thumbnail: '' })),
        moveInDate: formData.moveInDate ? new Date(formData.moveInDate).toISOString() : undefined,
      };

      const res = await axios.post('/api/agent/vacancies', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.message) {
        toast.success('Vacancy posted successfully!');
        navigate('/agent');
      }
    } catch (error) {
      console.error('Error posting vacancy:', error);
      toast.error(error.response?.data?.message || 'Failed to post vacancy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-6 md:p-8'>
      {/* Header */}
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={() => navigate('/agent')}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Post a Vacancy</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>
            Share your room/property details with students
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='bg-white dark:bg-gray-800 rounded-lg p-6 md:p-8 shadow'>
        {/* Location Section */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Location</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              type='text'
              name='location.area'
              placeholder='Area (e.g., Westlands, Karen)'
              value={formData.location.area}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
            <input
              type='text'
              name='location.city'
              placeholder='City (e.g., Nairobi)'
              value={formData.location.city}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
        </div>

        {/* Rent Section */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Rent Range</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <input
              type='number'
              name='rent.min'
              placeholder='Minimum rent (Ksh)'
              value={formData.rent.min}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
            <input
              type='number'
              name='rent.max'
              placeholder='Maximum rent (Ksh)'
              value={formData.rent.max}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
        </div>

        {/* Room Details */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Room Details</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <select
              name='roomType'
              value={formData.roomType}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            >
              <option value='single'>Single</option>
              <option value='double'>Double</option>
              <option value='shared'>Shared</option>
              <option value='studio'>Studio</option>
              <option value='bedsitter'>Bedsitter</option>
              <option value='apartment'>Apartment</option>
            </select>
            <input
              type='number'
              name='availableRooms'
              placeholder='Available rooms'
              value={formData.availableRooms}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
        </div>

        {/* Description */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Description</h2>
          <textarea
            name='description'
            placeholder='Describe the room/property (optional)'
            value={formData.description}
            onChange={handleInputChange}
            rows='5'
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
        </div>

        {/* Amenities */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Amenities</h2>
          <div className='flex gap-2 mb-4'>
            <input
              type='text'
              placeholder='Add amenity (e.g., WiFi, Kitchen)'
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddAmenity();
                }
              }}
              className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
            <button
              type='button'
              onClick={handleAddAmenity}
              className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors'
            >
              <Plus size={18} />
              Add
            </button>
          </div>

          {amenities.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {amenities.map((amenity, index) => (
                <div
                  key={index}
                  className='bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-full flex items-center gap-2'
                >
                  {amenity}
                  <button
                    type='button'
                    onClick={() => handleRemoveAmenity(index)}
                    className='hover:text-red-600'
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Move-in Date */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Move-in Date</h2>
          <input
            type='date'
            name='moveInDate'
            value={formData.moveInDate}
            onChange={handleInputChange}
            className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
        </div>

        {/* Photos Upload */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Image size={20} />
            Photos ({photos.length}/5)
          </h2>
          <div className='bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors'>
            <label className='cursor-pointer'>
              <div className='flex flex-col items-center gap-2'>
                <Upload className='text-gray-400' size={32} />
                <p className='text-sm text-gray-600 dark:text-gray-400'>Click to upload or drag & drop photos</p>
                <p className='text-xs text-gray-500 dark:text-gray-500'>PNG, JPG, WebP up to 5MB each (Max 5 files)</p>
              </div>
              <input
                type='file'
                multiple
                accept='image/*'
                onChange={handlePhotoUpload}
                disabled={uploadingMedia}
                className='hidden'
              />
            </label>
          </div>

          {/* Photo Preview */}
          {photos.length > 0 && (
            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mt-4'>
              {photos.map((photo, index) => (
                <div key={index} className='relative group'>
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className='w-full h-24 object-cover rounded-lg'
                  />
                  <button
                    type='button'
                    onClick={() => removePhoto(index)}
                    className='absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos Upload */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Video size={20} />
            Videos ({videos.length}/3)
          </h2>
          <div className='bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors'>
            <label className='cursor-pointer'>
              <div className='flex flex-col items-center gap-2'>
                <Upload className='text-gray-400' size={32} />
                <p className='text-sm text-gray-600 dark:text-gray-400'>Click to upload or drag & drop videos</p>
                <p className='text-xs text-gray-500 dark:text-gray-500'>MP4, WebM up to 100MB each (Max 3 files)</p>
              </div>
              <input
                type='file'
                multiple
                accept='video/*'
                onChange={handleVideoUpload}
                disabled={uploadingMedia}
                className='hidden'
              />
            </label>
          </div>

          {/* Video Preview */}
          {videos.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
              {videos.map((video, index) => (
                <div key={index} className='relative group'>
                  <video
                    src={video}
                    className='w-full h-32 object-cover rounded-lg bg-black'
                    controls
                  />
                  <button
                    type='button'
                    onClick={() => removeVideo(index)}
                    className='absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className='flex gap-4'>
          <button
            type='submit'
            disabled={loading}
            className='flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2'
          >
            {loading && <Loader size={18} className='animate-spin' />}
            {loading ? 'Posting...' : 'Post Vacancy'}
          </button>
          <button
            type='button'
            onClick={() => navigate('/agent')}
            className='px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
