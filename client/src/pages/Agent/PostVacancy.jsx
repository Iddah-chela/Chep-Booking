import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, X, Loader, Image, Video, MapPin, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import GridHelper, { sampleBuildingJson } from './_gridHelper';

export default function PostVacancy() {
  const { axios, getToken, navigate } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [mediaInput, setMediaInput] = useState('');
  const [mediaType, setMediaType] = useState('photo');
  const [formData, setFormData] = useState({
    title: '',
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
    availabilityFrom: '',
    availabilityTo: '',
    minBookingLeadDays: '2',
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
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddAmenity = () => {
    const value = amenityInput.trim();
    if (value && !amenities.includes(value)) {
      setAmenities([...amenities, value]);
      setAmenityInput('');
    }
  };

  // Prefill sample building JSON when toggling editor on first open
  const toggleGridEditor = () => {
    setShowGridEditor((s) => {
      const next = !s;
      if (next && !buildingsJson) {
        setBuildingsJson(sampleBuildingJson);
      }
      return next;
    });
  };

  const handleRemoveAmenity = (index) => {
    setAmenities(amenities.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddMedia = () => {
    const value = mediaInput.trim();
    if (!value) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      new URL(value);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (mediaType === 'photo') {
      if (photos.length >= 5) {
        toast.error('Maximum 5 photos allowed');
        return;
      }
      setPhotos([...photos, value]);
    } else {
      if (videos.length >= 3) {
        toast.error('Maximum 3 videos allowed');
        return;
      }
      setVideos([...videos, value]);
    }

    setMediaInput('');
    toast.success(`${mediaType} added successfully`);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('upload_preset', 'agent_vacancies');

        // Use fetch for cross-origin upload to avoid global axios headers causing CORS preflight failures
        const response = await fetch('https://api.cloudinary.com/v1_1/dq4zrrvge/auto/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(`Upload failed: ${response.status} ${text}`);
        }

        const responseData = await response.json();
        const uploadedUrl = responseData.secure_url;

        if (mediaType === 'photo') {
          if (photos.length >= 5) {
            toast.error('Maximum 5 photos reached');
            break;
          }
          setPhotos([...photos, uploadedUrl]);
          toast.success('Photo uploaded');
        } else {
          if (videos.length >= 3) {
            toast.error('Maximum 3 videos reached');
            break;
          }
          setVideos([...videos, uploadedUrl]);
          toast.success('Video uploaded');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeVideo = (index) => {
    setVideos(videos.filter((_, itemIndex) => itemIndex !== index));
  };

  const [showGridEditor, setShowGridEditor] = useState(false);
  const [buildingsJson, setBuildingsJson] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.title.trim()) {
        toast.error('Please add a vacancy title');
        return;
      }

      if (!formData.location.area || !formData.location.city) {
        toast.error('Please fill in location details');
        return;
      }

      if (!formData.rent.min || !formData.rent.max) {
        toast.error('Please fill in rent range');
        return;
      }

      if (Number(formData.rent.min) > Number(formData.rent.max)) {
        toast.error('Minimum rent cannot be greater than maximum rent');
        return;
      }

      if (!formData.availableRooms || Number(formData.availableRooms) < 1) {
        toast.error('Available rooms must be at least 1');
        return;
      }

      let parsedBuildings = [];
      if (showGridEditor && buildingsJson.trim()) {
        try {
          parsedBuildings = JSON.parse(buildingsJson);
          if (!Array.isArray(parsedBuildings)) throw new Error('Buildings should be an array');
        } catch (err) {
          toast.error('Invalid buildings JSON. Please check the format.');
          return;
        }
      }

      setLoading(true);
      const token = await getToken();

      const payload = {
        title: formData.title.trim(),
        location: formData.location,
        rent: {
          min: Number(formData.rent.min),
          max: Number(formData.rent.max),
        },
        roomType: formData.roomType,
        availableRooms: Number(formData.availableRooms),
        description: formData.description,
        amenities,
        photos: photos.map((url) => ({ url, publicId: '' })),
        videos: videos.map((url) => ({ url, publicId: '', thumbnail: '' })),
        buildings: parsedBuildings,
        moveInDate: formData.moveInDate ? new Date(formData.moveInDate).toISOString() : undefined,
        availabilityFrom: formData.availabilityFrom ? new Date(formData.availabilityFrom).toISOString() : undefined,
        availabilityTo: formData.availabilityTo ? new Date(formData.availabilityTo).toISOString() : undefined,
        minBookingLeadDays: Number(formData.minBookingLeadDays) || 2,
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
    <div className='max-w-5xl mx-auto p-4 md:p-8'>
      <div className='flex items-center gap-4 mb-8'>
        <button
          onClick={() => navigate('/agent')}
          className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Post a Vacancy</h1>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>Share the details students need to decide quickly.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700'>
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Title</h2>
          <input
            type='text'
            name='title'
            placeholder='e.g. Spacious bedsitter near campus'
            value={formData.title}
            onChange={handleInputChange}
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Location</h2>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='relative'>
              <MapPin className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' size={18} />
              <input
                type='text'
                name='location.area'
                placeholder='Area (e.g. Annex, Huruma)'
                value={formData.location.area}
                onChange={handleInputChange}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                required
              />
            </div>
            <input
              type='text'
              name='location.city'
              placeholder='City (e.g. Eldoret)'
              value={formData.location.city}
              onChange={handleInputChange}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              required
            />
          </div>
        </div>

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

        <div className='mb-8'>
          <div className='flex items-start justify-between mb-4'>
            <div>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Availability Window</h2>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>Use this to show when the vacancy opens and the last date someone can move in. (Optional)</p>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Available From</label>
              <input
                type='date'
                name='availabilityFrom'
                value={formData.availabilityFrom}
                onChange={handleInputChange}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                title='The earliest date a student can move in'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Students can move in on or after this date</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Move-In Deadline</label>
              <input
                type='date'
                name='availabilityTo'
                value={formData.availabilityTo}
                onChange={handleInputChange}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                title='The latest date a student can move in'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Last date a student can move in before this vacancy is no longer considered current</p>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Min Days Notice</label>
              <input
                type='number'
                min='0'
                name='minBookingLeadDays'
                placeholder='e.g. 2'
                value={formData.minBookingLeadDays}
                onChange={handleInputChange}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                title='How many days in advance students must book'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>Days in advance to confirm booking</p>
            </div>
          </div>
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Description</h2>
          <textarea
            name='description'
            placeholder='Describe the room or property'
            value={formData.description}
            onChange={handleInputChange}
            rows='5'
            className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
          />
        </div>

        <div className='mb-8'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white'>Advanced: House Grid</h2>
            <button
              type='button'
              onClick={toggleGridEditor}
              className='text-sm text-indigo-600 hover:underline'
            >
              {showGridEditor ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-2'>Paste building/grid JSON to author per-unit rooms (optional). Use the landlord listing format.</p>
          {showGridEditor && (
            <>
              <textarea
                placeholder='[ { id: "b1", name: "Main", rows: 2, cols: 3, grid: [[{ type: "room", roomType: "single", pricePerMonth: 8000 }]] } ]'
                value={buildingsJson}
                onChange={(e) => setBuildingsJson(e.target.value)}
                rows={8}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
              />
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>Tip: Use the sample JSON as a starting point.</p>
            </>
          )}
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>Amenities</h2>
          <div className='flex gap-2 mb-4'>
            <input
              type='text'
              placeholder='Add amenity (e.g. WiFi, Kitchen)'
              value={amenityInput}
              onChange={(e) => setAmenityInput(e.target.value)}
              onKeyDown={(e) => {
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

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Image size={20} />
            {mediaType === 'photo' ? `Photos (${photos.length}/5)` : `Videos (${videos.length}/3)`}
          </h2>
          
          {/* Media Type Selector and URL Input */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-3 mb-4'>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg'
            >
              <option value='photo'>Photo</option>
              <option value='video'>Video</option>
            </select>
            <input
              type='url'
              placeholder='Paste photo or video URL'
              value={mediaInput}
              onChange={(e) => setMediaInput(e.target.value)}
              className='md:col-span-2 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            />
            <button
              type='button'
              onClick={handleAddMedia}
              className='bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors'
            >
              <Plus size={18} />
              Add URL
            </button>
          </div>

          {/* File Upload Option */}
          <div className='mb-4'>
            <label className='flex items-center gap-2 px-4 py-3 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors'>
              <Upload size={18} className='text-indigo-600' />
              <span className='text-sm font-medium text-indigo-600'>
                {uploading ? 'Uploading...' : `Upload ${mediaType} from device`}
              </span>
              <input
                type='file'
                multiple
                accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
                onChange={handleFileUpload}
                disabled={uploading}
                className='hidden'
              />
            </label>
          </div>

          {/* Photos Grid */}
          {photos.length > 0 && (
            <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mt-4'>
              {photos.map((photo, index) => (
                <div key={index} className='relative group'>
                  <img src={photo} alt={`Photo ${index + 1}`} className='w-full h-24 object-cover rounded-lg' />
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

          {/* Videos List */}
          {videos.length > 0 && (
            <div className='space-y-2 mt-4'>
              {videos.map((video, index) => (
                <div key={index} className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center gap-2'>
                    <Video size={18} className='text-gray-500' />
                    <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>{video.substring(0, 50)}...</span>
                  </div>
                  <button
                    type='button'
                    onClick={() => removeVideo(index)}
                    className='text-red-500 hover:text-red-700'
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <Video size={20} />
            Videos ({videos.length}/3)
          </h2>
          <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>Paste a direct video URL for now.</p>

          {videos.length > 0 && (
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
              {videos.map((video, index) => (
                <div key={index} className='relative group'>
                  <video src={video} className='w-full h-32 object-cover rounded-lg bg-black' controls />
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
