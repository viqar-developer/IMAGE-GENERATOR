import React, { useContext } from 'react';
import { assets } from '../assets/assets';
import {  motion} from "framer-motion";
import { AppContext } from '../Context/AppContext';
import { useNavigate } from 'react-router-dom';

const GenerateBtn = () => {
  const {user,setShowLogin}=useContext(AppContext)
  const navigate = useNavigate()
  const onClickHandler=()=>{
if(user){
navigate('/result')
}else{
  setShowLogin(true)
}

  }
  
  return (
    <motion.div
    initial={{opacity:0.2,y:100}}
    transition={{duration:1}}
    whileInView={{opacity:1,y:0}}
    viewport={{once:true}}
     className='flex flex-col items-center justify-center my-20 py-12 md:py-12'>
      <h1  className='text-2xl md:text-3xl lg:text-4xl mt-4 font-semibold text-neutral-800 py-6 md:py-16'>See The Magic. Try Now</h1>
      <button onClick={onClickHandler}  className='sm:text-lg text-white bg-black w-auto mt-8 px-12 py-2.5 flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-500'>Generate Images
        <img  className = 'h-6'  src={assets.star_group} alt="" />
      </button>
    </motion.div>
  );
}

export default GenerateBtn;
