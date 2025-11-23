"use client"
import { Box, Flex, Button, Spacer } from '@chakra-ui/react'

export default function Header() {
  return (
    <Box
      as="header"
      py={4}
      px={{ base: 6, md: 32, lg: 56 }}
      bg="white"
      boxShadow="none"
      borderBottomWidth={0}
      position="sticky"
      top={0}
      zIndex={50}
    >
      <Flex align="center">
        <Box as="img" src="/prizeloop.png" alt="PrizeLoop" height="40px" />
        <Spacer />
        <Button colorScheme="orange" variant="solid">
          Play Now
        </Button>
      </Flex>
    </Box>
  )
}
