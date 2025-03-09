import gsap from 'gsap';

// Like animation - bouncing heart effect
export const likeAnimation = (element: HTMLElement) => {
  gsap.fromTo(
    element,
    { scale: 1 },
    { 
      scale: 1.3, 
      duration: 0.2, 
      ease: "elastic.out(1, 0.5)", 
      yoyo: true, 
      repeat: 1 
    }
  );
};

// Favorite animation - spinning star effect
export const favoriteAnimation = (element: HTMLElement, isFavoriting: boolean) => {
  if (isFavoriting) {
    gsap.to(element, {
      rotation: 360,
      scale: 1.2,
      duration: 0.5,
      ease: "back.out(1.7)",
      onComplete: () => gsap.to(element, { scale: 1, duration: 0.2 })
    });
  } else {
    gsap.to(element, {
      rotation: -180,
      scale: 0.8,
      duration: 0.3,
      ease: "back.in(1.7)",
      onComplete: () => gsap.to(element, { 
        rotation: 0,
        scale: 1, 
        duration: 0.2,
        ease: "power2.out"
      })
    });
  }
};

// Delete animation - fade and shrink effect
export const deleteAnimation = (element: HTMLElement) => {
  return gsap.to(element, {
    opacity: 0,
    scale: 0.8,
    y: -20,
    duration: 0.3,
    ease: "power2.in"
  });
};

// Create animation - fade in and slide up
export const createAnimation = (element: HTMLElement) => {
  gsap.from(element, {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.4,
    ease: "power2.out"
  });
};

// Success animation with confetti and clickable message
export const successAnimation = (element: HTMLElement) => {
  // Create success message container
  const messageContainer = document.createElement('div');
  messageContainer.style.position = 'fixed';
  messageContainer.style.left = '50%';
  messageContainer.style.top = '50%';
  messageContainer.style.transform = 'translate(-50%, -50%)';
  messageContainer.style.zIndex = '10000';
  messageContainer.style.cursor = 'pointer';
  messageContainer.style.userSelect = 'none';
  messageContainer.style.padding = '20px 40px';
  messageContainer.style.background = 'rgba(0, 0, 0, 0.8)';
  messageContainer.style.borderRadius = '50px';
  messageContainer.style.color = 'white';
  messageContainer.style.fontSize = '24px';
  messageContainer.style.fontWeight = 'bold';
  messageContainer.style.textAlign = 'center';
  messageContainer.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  messageContainer.textContent = 'SUCCESS! YOU JUST CREATED A NEW PASTE';
  document.body.appendChild(messageContainer);

  // Create confetti container
  const confettiContainer = document.createElement('div');
  confettiContainer.style.position = 'fixed';
  confettiContainer.style.inset = '0';
  confettiContainer.style.pointerEvents = 'none';
  confettiContainer.style.zIndex = '9999';
  document.body.appendChild(confettiContainer);

  // Create confetti particles
  const colors = [
    '#FCD34D', '#34D399', '#60A5FA', '#F472B6', '#A78BFA', 
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#FFD93D', '#6C5CE7', '#FF8C94', '#A8E6CF', '#DCEDC1'
  ];
  const confettiCount = 250; // Increased confetti count

  const createConfetti = () => {
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'absolute';
      confetti.style.width = `${Math.random() * 15 + 5}px`; // Larger confetti
      confetti.style.height = `${Math.random() * 8 + 3}px`; // Larger confetti
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.borderRadius = '2px';
      confetti.style.left = '50%';
      confetti.style.top = '50%';
      confetti.style.opacity = `${Math.random() * 0.5 + 0.5}`; // Varied opacity
      confettiContainer.appendChild(confetti);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 20 + Math.random() * 30; // Increased velocity
      const distance = 250 + Math.random() * 300; // Increased distance
      const rotation = Math.random() * 720 - 360;
      const duration = 2.5 + Math.random() * 2.5; // Longer duration for particles

      gsap.to(confetti, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: rotation,
        opacity: 0,
        duration: duration,
        ease: "power2.out",
        onComplete: () => confetti.remove()
      });
    }
  };

  // Initial confetti burst
  createConfetti();

  // Additional confetti bursts every 800ms
  const burstInterval = setInterval(createConfetti, 800);

  // Animate the success message
  gsap.from(messageContainer, {
    scale: 0.5,
    opacity: 0,
    duration: 0.5,
    ease: "back.out(1.7)"
  });

  // Pulsing animation for the message
  gsap.to(messageContainer, {
    scale: 1.05,
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut"
  });

  // Handle click to dismiss
  const cleanup = () => {
    clearInterval(burstInterval);
    confettiContainer.remove();
    messageContainer.remove();
  };

  messageContainer.addEventListener('click', cleanup);

  // Auto cleanup after 5 seconds if not clicked
  setTimeout(cleanup, 5000);

  // Animate the target element
  gsap.fromTo(element, 
    { scale: 0.8, opacity: 0 },
    { 
      scale: 1, 
      opacity: 1, 
      duration: 0.4,
      ease: "back.out(1.7)"
    }
  );
};

// Error animation - shake effect
export const errorAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    x: [-10, 10, -8, 8, -5, 5, 0],
    duration: 0.5,
    ease: "power2.out"
  });
};

// Loading animation - pulse effect
export const loadingAnimation = (element: HTMLElement) => {
  gsap.to(element, {
    opacity: 0.5,
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: "power1.inOut"
  });
};