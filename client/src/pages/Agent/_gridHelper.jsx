import React from 'react';

export const sampleBuildingJson = JSON.stringify([
  {
    id: 'b1',
    name: 'Main Building',
    rows: 3,
    cols: 4,
    grid: [
      [ { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true }, { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true }, { type: 'room', roomType: 'double', pricePerMonth: 12000, isVacant: false }, { type: 'common' } ],
      [ { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true }, { type: 'room', roomType: 'double', pricePerMonth: 12000, isVacant: true }, { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true }, { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true } ],
      [ { type: 'common' }, { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true }, { type: 'room', roomType: 'single', pricePerMonth: 8000, isVacant: true }, { type: 'room', roomType: 'double', pricePerMonth: 12000, isVacant: false } ]
    ]
  }
], null, 2);

export default function GridHelper(){
  return null;
}
