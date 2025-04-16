import pygame
import random

class Explosion:
    def __init__(self, x, y, size=30, color=(255, 200, 50)):
        self.x = x
        self.y = y
        self.size = size
        self.color = color
        self.particles = []
        self.lifetime = 30  # frames
        self.current_frame = 0
        self.active = True
        
        # Create explosion particles
        num_particles = random.randint(8, 15)
        for _ in range(num_particles):
            # Random velocity
            vel_x = random.uniform(-3, 3)
            vel_y = random.uniform(-3, 3)
            # Random size
            size = random.randint(2, 6)
            # Random lifetime
            lifetime = random.randint(20, 30)
            # Create particle
            self.particles.append({
                "x": self.x,
                "y": self.y,
                "vel_x": vel_x,
                "vel_y": vel_y,
                "size": size,
                "lifetime": lifetime,
                "current_frame": 0
            })
    
    def update(self):
        self.current_frame += 1
        if self.current_frame >= self.lifetime:
            self.active = False
            return
        
        # Update particles
        for particle in self.particles:
            particle["x"] += particle["vel_x"]
            particle["y"] += particle["vel_y"]
            particle["current_frame"] += 1
    
    def draw(self, screen):
        for particle in self.particles:
            # Skip drawing if particle expired
            if particle["current_frame"] >= particle["lifetime"]:
                continue
                
            # Fade out
            alpha = 255 * (1 - particle["current_frame"] / particle["lifetime"])
            
            # Get particle color with fading
            r, g, b = self.color
            final_color = (r, g, b, alpha)
            
            # Create a temporary surface for this particle with alpha
            surf = pygame.Surface((particle["size"] * 2, particle["size"] * 2), pygame.SRCALPHA)
            pygame.draw.circle(
                surf, 
                final_color, 
                (particle["size"], particle["size"]), 
                particle["size"]
            )
            
            # Blit the particle surface onto the screen
            screen.blit(
                surf, 
                (particle["x"] - particle["size"], particle["y"] - particle["size"])
            )

class ShieldEffect:
    def __init__(self, player):
        self.player = player
        self.radius = player.width // 2 + 10
        self.color = (100, 200, 255, 128)  # Semi-transparent blue
        self.active = True
        self.duration = 10 * 60  # 10 seconds (at 60fps)
        self.current_frame = 0
    
    def update(self):
        self.current_frame += 1
        if self.current_frame >= self.duration:
            self.active = False
    
    def draw(self, screen):
        if not self.active:
            return
            
        # Calculate alpha based on time left and add a pulse effect
        base_alpha = 128 * (1 - self.current_frame / self.duration)
        pulse = 40 * abs(math.sin(self.current_frame * 0.1))
        alpha = min(255, base_alpha + pulse)
        
        # Draw shield with transparency
        surf = pygame.Surface((self.radius * 2, self.radius * 2), pygame.SRCALPHA)
        pygame.draw.circle(
            surf,
            (self.color[0], self.color[1], self.color[2], alpha),
            (self.radius, self.radius),
            self.radius
        )
        
        # Draw a border for the shield
        pygame.draw.circle(
            surf,
            (self.color[0], self.color[1], self.color[2], alpha + 50),
            (self.radius, self.radius),
            self.radius,
            2
        )
        
        # Blit the shield surface onto the screen
        screen.blit(
            surf,
            (self.player.x - self.radius, self.player.y - self.radius)
        )

# Import math for shield effect
import math

class SlowTimeEffect:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.active = True
        self.duration = 60  # 1 second visual effect
        self.current_frame = 0
        self.color = (150, 100, 255, 120)  # Purple with transparency
    
    def update(self):
        self.current_frame += 1
        if self.current_frame >= self.duration:
            self.active = False
    
    def draw(self, screen):
        if not self.active:
            return
            
        # Calculate alpha based on time
        alpha = int(120 * (1.0 - self.current_frame / self.duration))
        if alpha <= 0:
            return
            
        # Create a surface for the slow time effect
        surf = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        
        # Draw a semi-transparent overlay
        overlay_color = (self.color[0], self.color[1], self.color[2], alpha)
        pygame.draw.rect(surf, overlay_color, (0, 0, self.width, self.height))
        
        # Draw some clock-like elements
        num_elements = 8
        radius = min(self.width, self.height) // 4
        center_x = self.width // 2
        center_y = self.height // 2
        
        # Draw elements with varying transparency
        for i in range(num_elements):
            angle = i * (360 / num_elements)
            rad_angle = math.radians(angle)
            x = center_x + radius * math.cos(rad_angle)
            y = center_y + radius * math.sin(rad_angle)
            
            # Element size reduces over time
            size = int(20 * (1.0 - self.current_frame / self.duration))
            if size <= 0:
                continue
                
            # Draw the element
            element_color = (255, 255, 255, alpha + 50)
            pygame.draw.circle(surf, element_color, (int(x), int(y)), size)
        
        # Blit the time effect surface onto the screen
        screen.blit(surf, (0, 0))