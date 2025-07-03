'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

const logos = [
  { name: 'Microsoft', src: '/logos/microsoft.svg' },
  { name: 'Google', src: '/logos/google.svg' },
  { name: 'Amazon', src: '/logos/amazon.svg' },
  { name: 'Meta', src: '/logos/meta.svg' },
  { name: 'Apple', src: '/logos/apple.svg' },
  { name: 'Netflix', src: '/logos/netflix.svg' },
]

export function LogosSection() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Trusted by teams at leading companies
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6"
        >
          {logos.map((logo, index) => (
            <motion.div
              key={logo.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="flex items-center justify-center"
            >
              <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-background/50 p-2 grayscale hover:grayscale-0 transition-all duration-300">
                <span className="text-sm font-semibold text-muted-foreground">
                  {logo.name}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}