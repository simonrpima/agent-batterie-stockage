'use client';
import { useState } from 'react';

export default function Prospection() {
  const [dept, setDept] = useState('59');
  const [nb, setNb] = useState('50');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const IRRADIATION = {
    '59':950,'62':950,'80':1000,'02':1050,'60':1050,'76':1000,
    '33':1250,'31':1350,'34':1450,'13':1550,'83':1550,'06':1500,
    '69':1250,'38':1350,'73':1350,'74':1350,'67':1100,'68':1150
  };

  function calcFiche(naf, tranche, dept) {
    const elevage = ['0141','0142','0143','0144','0145','0146','0147','0149'];
    const nafClean = (naf||'').replace('.','').substring(0,4);
    const isElevage = elevage.some(e => nafClean.startsWith(e));
    const surfaces = {'00':isElevage?800:600,'01':isElevage?1200:800,'02':
