"use client"
import { Box, Container, Flex, Heading, Text, Stack, Link } from '@chakra-ui/react'

export default function FeelGood() {
  return (
  <Box as="section" py={12} bgGradient="linear(to-t, gray.200 0%, white 100%)">
      <Container maxW="6xl">
        <Flex direction={{ base: 'column', md: 'row' }} align="center" gap={{ base: 8, md: 12 }}>
          {/* Left: image */}
          <Box
            flex="1 1 0%"
            w={{ base: '100%', md: '40%' }}
            maxW={{ md: '320px', lg: '340px' }}
            mb={{ base: 8, md: 0 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="transparent"
            borderRadius="1.25rem"
            overflow="hidden"
          >
            <img
              src="/feel_good.png"
              alt="Feel good about your purchase"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>
          {/* Right: text */}
          <Box flex="1 1 0%" w={{ base: '100%', md: '60%' }}>
            <Stack spacing={6} textAlign={{ base: 'center', md: 'left' }}>
              <Heading size="lg">Feel Good About Your Purchase</Heading>
              <Text fontSize="lg" color="gray.700" maxW="2xl">
                Not only does your ticket give you a shot at life-changing money, but 1% of all proceeds are donated to{' '}
                <Link href="https://ran.org" color="teal.600" isExternal fontWeight="bold" textDecoration="underline">
                  Rainforest Action Network
                </Link>{' '}
                to help save endangered animals and protect our planet. Play for the thrill—and feel good knowing you’re making a difference!
              </Text>
            </Stack>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}
