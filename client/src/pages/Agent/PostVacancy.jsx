import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, Plus, X, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PostVacancy() {
  const { axios, getToken, navigate } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [amenities, setAmenities] = useState([]);
  const [amenityInput, setAmenityInput] = useState('');
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
