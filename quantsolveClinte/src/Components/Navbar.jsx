import React from 'react'

const Navbar = () => {
  return (
    <nav className="w-full h-16 bg-[#0B0F19] border-b border-[#374151] flex items-center justify-between px-6">
      
      {/* Logo / Brand */}
      <h1 className="text-xl font-semibold text-[#F9FAFB] tracking-wide cursor-pointer">
        Quant<span className="text-[#F59E0B]">Solve</span>
      </h1>

      {/* Navigation Links (optional for now) */}
      <div className="hidden md:flex items-center gap-6 text-textSecondary">
      </div>

    </nav>
  )
}

export default Navbar