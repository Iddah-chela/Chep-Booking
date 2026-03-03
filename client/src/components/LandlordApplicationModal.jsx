import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Home, Phone, ArrowRight, CheckCircle, CreditCard, FileText, X, Upload } from 'lucide-react'

const LandlordApplicationModal = ({ onClose }) => {
    const { getToken, user, axios, setIsOwner, fetchUser } = useAppContext()
    
    const [phoneNumber, setPhoneNumber] = useState('')
    const [idDocument, setIdDocument] = useState(null)
    const [titleDeed, setTitleDeed] = useState(null)
    const [idPreview, setIdPreview] = useState('')
    const [deedPreview, setDeedPreview] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleFileChange = (e, type) => {
        const file = e.target.files[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return }
        const preview = URL.createObjectURL(file)
        if (type === 'id') { setIdDocument(file); setIdPreview(preview) }
        else { setTitleDeed(file); setDeedPreview(preview) }
    }

    const handleSignup = async (e) => {
        e.preventDefault()
        
        if (!phoneNumber || phoneNumber.length < 10) {
            toast.error('Please enter a valid phone number')
            return
        }
        if (!idDocument) {
            toast.error('Please upload a copy of your ID')
            return
        }
        
        setLoading(true)
        
        try {
            const token = await getToken()
            if (!token) {
                toast.error('Please login to continue')
                return
            }

            const formData = new FormData()
            formData.append('phoneNumber', phoneNumber)
            formData.append('idDocument', idDocument)
            if (titleDeed) formData.append('titleDeed', titleDeed)

            const { data } = await axios.post(
                '/api/landlord-application/instant-signup',
                formData,
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
            )
            
            if (data.success) {
                setSuccess(true)
                setIsOwner(true)
                fetchUser()
                toast.success(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to sign up as landlord')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div onClick={onClose} className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
                <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-8 text-center shadow-2xl'>
                    <div className='w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                        <CheckCircle className='w-8 h-8 text-green-600' />
                    </div>
                    <h2 className='text-2xl font-bold text-gray-900 mb-2'>You're a Landlord!</h2>
                    <p className='text-gray-600 mb-6'>You can now list properties and manage rentals. Head to your dashboard to get started.</p>
                    <button 
                        onClick={onClose}
                        className='w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2'
                    >
                        Go to Dashboard <ArrowRight className='w-4 h-4' />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div onClick={onClose} className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
            <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden'>
                {/* Header */}
                <div className='relative bg-gradient-to-r from-indigo-600 to-purple-600 p-6'>
                    <button type="button" onClick={onClose} className='absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors'>
                        <X className='w-4 h-4' />
                    </button>
                    <div className='flex items-center gap-3'>
                        <div className='w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center'>
                            <Home className='w-6 h-6 text-white' />
                        </div>
                        <div>
                            <h2 className='text-white text-xl font-bold'>Become a Landlord</h2>
                            <p className='text-white/80 text-sm'>Start listing properties in seconds</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSignup} className='p-6'>
                    <div className='mb-6'>
                        <div className='flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-4'>
                            <CheckCircle className='w-5 h-5 text-green-600 mt-0.5 flex-shrink-0' />
                            <div className='text-sm text-green-800 dark:text-green-200'>
                                <p className='font-semibold'>Instant access — no waiting!</p>
                                <p className='mt-0.5 text-green-700 dark:text-green-300'>You'll be able to create property listings immediately after signing up.</p>
                            </div>
                        </div>

                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                            <Phone className='w-4 h-4 inline mr-1' />
                            Phone Number <span className='text-red-500'>*</span>
                        </label>
                        <input 
                            type='tel'
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg bg-white dark:bg-gray-700 dark:text-gray-100'
                            placeholder='0712 345 678'
                            required
                        />
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1.5'>Tenants may use this to reach you about viewings.</p>
                    </div>

                    {/* ID Document */}
                    <div className='mb-4'>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                            <CreditCard className='w-4 h-4 inline mr-1' />
                            National ID / Passport <span className='text-red-500'>*</span>
                        </label>
                        <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-3 cursor-pointer transition-all ${
                            idDocument ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 bg-gray-50 dark:bg-gray-700'
                        }`}>
                            <input type='file' accept='image/*,.pdf' className='hidden' onChange={(e) => handleFileChange(e, 'id')} />
                            {idDocument ? (
                                <span className='flex items-center gap-2 text-sm text-green-700 dark:text-green-300 font-medium'>
                                    <CheckCircle className='w-4 h-4' /> {idDocument.name}
                                </span>
                            ) : (
                                <span className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                                    <Upload className='w-4 h-4' /> Upload ID front page (image or PDF)
                                </span>
                            )}
                        </label>
                    </div>

                    {/* Title Deed — optional */}
                    <div className='mb-6'>
                        <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                            <FileText className='w-4 h-4 inline mr-1' />
                            Title Deed / Lease Agreement <span className='text-xs text-gray-400 ml-1'>(optional)</span>
                        </label>
                        <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-3 cursor-pointer transition-all ${
                            titleDeed ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 bg-gray-50 dark:bg-gray-700'
                        }`}>
                            <input type='file' accept='image/*,.pdf' className='hidden' onChange={(e) => handleFileChange(e, 'deed')} />
                            {titleDeed ? (
                                <span className='flex items-center gap-2 text-sm text-green-700 dark:text-green-300 font-medium'>
                                    <CheckCircle className='w-4 h-4' /> {titleDeed.name}
                                </span>
                            ) : (
                                <span className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                                    <Upload className='w-4 h-4' /> Upload title deed or lease (image or PDF)
                                </span>
                            )}
                        </label>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1.5'>Helps verify property ownership during admin review.</p>
                    </div>

                    <button 
                        type='submit'
                        disabled={loading}
                        className='w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                    >
                        {loading ? (
                            <span className='flex items-center gap-2'>
                                <div className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin'></div>
                                Setting up...
                            </span>
                        ) : (
                            <>Become a Landlord <ArrowRight className='w-4 h-4' /></>
                        )}
                    </button>

                    <p className='text-xs text-gray-400 text-center mt-4'>
                        By signing up, you agree to our terms of service. Admin may review your account.
                    </p>
                </form>
            </div>
        </div>
    )
}

export default LandlordApplicationModal
