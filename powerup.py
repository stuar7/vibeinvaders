import pygame
import random

class PowerUp:
    def __init__(self, x, y, type):
        self.x = x
        self.y = y
        self.width = 20
        self.height = 20
        self.type = type
        self.active = True
        self.speed = 1.0  # Reduced from 2 to make power-ups slower
        
        # Set color based on power-up type
        self.colors = {
            "shield": (0, 255, 255),    # Cyan
            "rapid_fire": (255, 255, 0), # Yellow
            "multi_shot": (0, 255, 0),   # Green
            "extra_life": (255, 100, 100), # Light red
            "slow_time": (150, 100, 255)  # Purple
        }
        self.color = self.colors.get(self.type, (255, 255, 255))
    
    def update(self):
        # Move power-up down at a slower speed
        self.y += self.speed
        
        # Only deactivate if it goes well below the player area
        if self.y > 800:  # Added safety margin beyond screen height
            self.active = False
    
    def draw(self, screen):
        if not self.active:
            return
            
        # Draw power-up as a special shape based on type
        if self.type == "shield":
            # Draw a shield (circle)
            pygame.draw.circle(screen, self.color, (self.x, self.y), self.width // 2)
            pygame.draw.circle(screen, (0, 0, 0), (self.x, self.y), self.width // 2 - 3)
            
        elif self.type == "rapid_fire":
            # Draw a lightning bolt
            points = [
                (self.x - self.width // 2, self.y - self.height // 2),  # Top left
                (self.x + self.width // 4, self.y - self.height // 6),  # Middle right
                (self.x - self.width // 4, self.y + self.height // 6),  # Middle left
                (self.x + self.width // 2, self.y + self.height // 2)   # Bottom right
            ]
            pygame.draw.polygon(screen, self.color, points)
            
        elif self.type == "multi_shot":
            # Draw three small rectangles side by side
            for i in range(-1, 2):
                pygame.draw.rect(
                    screen, 
                    self.color, 
                    (self.x + i * 8 - 2, self.y - self.height // 2, 4, self.height)
                )
                
        elif self.type == "extra_life":
            # Draw a heart shape
            radius = self.width // 4
            # Draw two circles for the top of the heart
            pygame.draw.circle(screen, self.color, (self.x - radius, self.y - radius // 2), radius)
            pygame.draw.circle(screen, self.color, (self.x + radius, self.y - radius // 2), radius)
            # Draw a triangle for the bottom of the heart
            points = [
                (self.x - radius * 2, self.y - radius // 2),
                (self.x + radius * 2, self.y - radius // 2),
                (self.x, self.y + radius * 2)
            ]
            pygame.draw.polygon(screen, self.color, points)
            
        elif self.type == "slow_time":
            # Draw an hourglass shape
            # Top triangle
            top_points = [
                (self.x - self.width // 2, self.y - self.height // 2),  # Top left
                (self.x + self.width // 2, self.y - self.height // 2),  # Top right
                (self.x, self.y)   # Middle
            ]
            # Bottom triangle
            bottom_points = [
                (self.x - self.width // 2, self.y + self.height // 2),  # Bottom left
                (self.x + self.width // 2, self.y + self.height // 2),  # Bottom right
                (self.x, self.y)   # Middle
            ]
            pygame.draw.polygon(screen, self.color, top_points)
            pygame.draw.polygon(screen, self.color, bottom_points)
    
    def check_collision(self, player):
        # Simple rectangle collision detection
        player_rect = pygame.Rect(
            player.x - player.width // 2, 
            player.y - player.height // 2,
            player.width, 
            player.height
        )
        
        powerup_rect = pygame.Rect(
            self.x - self.width // 2,
            self.y - self.height // 2,
            self.width,
            self.height
        )
        
        return player_rect.colliderect(powerup_rect)

def spawn_random_powerup(x, y):
    """Create a random power-up at the given position"""
    powerup_types = ["shield", "rapid_fire", "multi_shot", "extra_life", "slow_time"]
    weights = [0.25, 0.25, 0.25, 0.1, 0.15]  # Extra life is rarer, slow_time is moderately rare
    
    type = random.choices(powerup_types, weights=weights, k=1)[0]
    return PowerUp(x, y, type)