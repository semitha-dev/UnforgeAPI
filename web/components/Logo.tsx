'use client'

import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className = '', size = 24 }: LogoProps) {
  return (
    <Image
      src="/new_logo.png"
      alt="UnforgeAPI"
      width={size}
      height={size}
      className={className}
      priority
    />
  )
}
