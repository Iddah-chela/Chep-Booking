import React, { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import toast from 'react-hot-toast'
import { Shield, Building2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const ManagedProperties = () => {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, getToken, axios } = useAppContext()
  const navigate = useNavigate()

  const fetchManagedProperties = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/properties/managed', {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (response.data.success) {
        setProperties(response.data.properties)
      }
    } catch (error) {
      toast.error('Failed to load managed properties')
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (propertyId, buildingId, row, col) => {
    try {
      const response = await axios.post('/api/properties/caretaker-toggle-room', {
        propertyId, buildingId, row, col
      }, {
        headers: { Authorization: `Bearer ${await getToken()}` }
      })
      if (response.data.success) {
        toast.success(response.data.message)
        fetchManagedProperties()
      } else {
        toast.error(response.data.message)
      }
    } catch (error) {
      toast.error('Failed to update room availability')
    }
  }

  useEffect(() => {
    if (user) fetchManagedProperties()
  }, [user])

  return (
    <>
      <Navbar />
      <div className='py-28 md:py-32 px-4 md:px-16 lg:px-24 xl:px-32 min-h-screen'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-8'>
          <button onClick={() => navigate(-1)} className='p-2 hover:bg-gray-100 rounded-lg'>
            <ArrowLeft className='w-5 h-5' />
          </button>
          <div>
            <div className='flex items-center gap-2'>
              <Shield className='w-6 h-6 text-indigo-600' />
              <h1 className='text-2xl md:text-3xl font-bold text-gray-900'>Managed Properties</h1>
            </div>
            <p className='text-gray-500 text-sm mt-1'>Properties you manage as a caretaker — toggle room availability</p>
          </div>
        </div>

        {loading ? (
          <div className='text-center py-20 text-gray-500'>Loading managed properties...</div>
        ) : properties.length === 0 ? (
          <div className='text-center py-20 bg-gray-50 rounded-xl'>
            <Building2 className='w-12 h-12 text-gray-300 mx-auto mb-4' />
            <p className='text-gray-500 text-lg mb-2'>No managed properties</p>
            <p className='text-gray-400 text-sm'>When a landlord adds your email as a caretaker, their properties will appear here.</p>
          </div>
        ) : (
          <div className='grid gap-6'>
            {properties.map((property) => (
              <div key={property._id} className='border border-gray-200 rounded-xl p-6 bg-white shadow-sm overflow-hidden'>
                {/* Property Info */}
                <div className='flex flex-col sm:flex-row justify-between items-start gap-3 mb-4'>
                  <div className='min-w-0'>
                    <h4 className='text-xl font-bold text-gray-800'>{property.name}</h4>
                    <p className='text-sm text-gray-600 mt-1'>{property.address}, {property.estate}</p>
                    <p className='text-sm text-gray-500'>{property.place} • {property.propertyType}</p>
                    {property.owner && (
                      <p className='text-xs text-indigo-600 mt-1'>Owner: {property.owner.username}</p>
                    )}
                  </div>
                  <div className='flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full'>
                    <Shield className='w-3.5 h-3.5 text-indigo-600' />
                    <span className='text-xs font-medium text-indigo-700'>Caretaker Access</span>
                  </div>
                </div>

                {/* Stats */}
                <div className='flex gap-4 mb-4 text-sm flex-wrap'>
                  <div className='px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium'>
                    {property.vacantRooms} Vacant
                  </div>
                  <div className='px-4 py-2 bg-red-50 text-red-700 rounded-lg font-medium'>
                    {property.totalRooms - property.vacantRooms} Occupied
                  </div>
                  <div className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium'>
                    {property.totalRooms} Total
                  </div>
                </div>

                {/* Building Grids (toggle-only view) */}
                {property.buildings.map((building) => {
                  const CELL = 52
                  return (
                    <div key={building.id} className='mt-4 border-t pt-4'>
                      <h5 className='font-semibold text-gray-700 mb-2 text-sm'>{building.name}</h5>
                      <div className='overflow-x-auto'>
                        <div className='inline-block pb-2'>
                          {/* Roof */}
                          <div className='flex justify-center'>
                            <svg width={building.cols * CELL} height='22'>
                              <polygon
                                points={`0,22 ${(building.cols * CELL) / 2},0 ${building.cols * CELL},22`}
                                fill='#7c3aed' stroke='#4c1d95' strokeWidth='2'
                              />
                            </svg>
                          </div>
                          {/* Grid */}
                          <div className='bg-white shadow border-2 border-indigo-400'>
                            {building.grid.map((row, rowIndex) => (
                              <div key={rowIndex} className='flex'>
                                {row.map((cell, colIndex) => {
                                  if (cell.type === 'empty') return (
                                    <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 bg-gray-50' />
                                  )
                                  if (cell.type === 'common') return (
                                    <div key={colIndex} style={{width: CELL, height: CELL}} className='border border-gray-200 bg-gray-100 flex items-center justify-center'>
                                      <span className='text-[8px] text-gray-400'>C</span>
                                    </div>
                                  )
                                  return (
                                    <div
                                      key={colIndex}
                                      style={{width: CELL, height: CELL}}
                                      className={`relative border border-gray-200 overflow-hidden group ${cell.isBooked ? 'bg-yellow-50' : cell.isVacant ? 'bg-green-50' : 'bg-red-50'}`}
                                    >
                                      <div className='flex flex-col items-center justify-center h-full text-center px-0.5'>
                                        <span className='font-semibold leading-tight truncate w-full text-center' style={{fontSize: '8px'}}>{cell.roomType}</span>
                                        <span style={{fontSize: '7px'}} className='opacity-70'>Ksh {cell.pricePerMonth}</span>
                                        <span style={{fontSize: '7px'}} className={cell.isBooked ? 'text-yellow-600' : cell.isVacant ? 'text-green-600' : 'text-red-600'}>{cell.isBooked ? 'Booked' : cell.isVacant ? 'Vacant' : 'Occupied'}</span>
                                      </div>
                                      {/* Door */}
                                      <div className='absolute bottom-0 left-1/2 -translate-x-1/2' style={{width: '20%', height: '18%', background: '#7c2d12', borderRadius: '2px 2px 0 0', minHeight: '5px', minWidth: '6px'}}></div>
                                      {/* Toggle overlay */}
                                      <button
                                        onClick={() => toggleAvailability(property._id, building.id, rowIndex, colIndex)}
                                        className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white font-bold ${cell.isVacant ? 'bg-green-600/85' : 'bg-red-600/85'}`}
                                        style={{fontSize: '9px'}}
                                      >
                                        {cell.isVacant ? 'Mark\nOccupied' : 'Mark\nVacant'}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            ))}
                          </div>
                          <div className='h-1.5 bg-gradient-to-b from-gray-300 to-gray-500 rounded-b'></div>
                        </div>
                      </div>
                      <p className='text-xs text-gray-400 mt-1'>Hover any room to toggle availability</p>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  )
}

export default ManagedProperties
