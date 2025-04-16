import pygame

class Missile:
    def __init__(self, x, y, horizontal_speed=0, damage=1, color=(255, 255, 0), missile_type="standard"):
        self.x = x
        self.y = y
        self.vertical_speed = 7  
        self.horizontal_speed = horizontal_speed
        self.width = 4
        self.height = 15
        self.color = color
        self.active = True
        self.damage = damage  # Damage amount
        self.type = missile_type
        
        # Adjust appearance based on missile type
        if missile_type == "rapid":
            self.color = (0, 255, 255)  # Cyan
            self.width = 3
            self.height = 12
            self.vertical_speed = 9  # Faster
        elif missile_type == "powerful":
            self.color = (255, 100, 0)  # Orange
            self.width = 6
            self.height = 18
            self.damage = 2  # Does double damage
    
    def update(self, screen_width):
        # Move missile upward and horizontally
        self.y -= self.vertical_speed
        self.x += self.horizontal_speed
        
        # Deactivate missile if it goes off screen
        if self.y < 0 or self.x < 0 or self.x > screen_width:
            self.active = False
    
    def draw(self, screen):
        if self.active:
            # Draw missile as a rectangle
            pygame.draw.rect(
                screen, 
                self.color, 
                (self.x - self.width // 2, self.y - self.height // 2, 
                 self.width, self.height)
            )

class AlienMissile(Missile):
    """Missile fired by bomber aliens"""
    def __init__(self, x, y, target_x=None, target_y=None):
        super().__init__(x, y, 0, 1, (255, 100, 100), "alien")
        self.vertical_speed = -4  # Moves downward
        self.width = 6
        self.height = 15
        
        # If target coordinates are provided, aim towards the target
        if target_x is not None and target_y is not None:
            # Calculate direction vector to target
            dx = target_x - x
            dy = target_y - y
            # Normalize the vector
            length = (dx**2 + dy**2)**0.5
            if length > 0:
                dx /= length
                dy /= length
                # Set speeds proportional to direction
                self.horizontal_speed = dx * 4
                self.vertical_speed = -dy * 4  # Negative because we're moving down
    
    def update(self, screen_width, screen_height=600):
        # Override to check for bottom of screen too
        self.y -= self.vertical_speed  # Note: vertical_speed is negative
        self.x += self.horizontal_speed
        
        # Deactivate missile if it goes off screen
        if self.y < 0 or self.y > screen_height or self.x < 0 or self.x > screen_width:
            self.active = False
    
    def draw(self, screen):
        if self.active:
            # Draw alien missile as a different shape
            points = [
                (self.x, self.y + self.height // 2),  # Bottom tip
                (self.x - self.width // 2, self.y - self.height // 2),  # Top left
                (self.x + self.width // 2, self.y - self.height // 2)   # Top right
            ]
            pygame.draw.polygon(screen, self.color, points)

class MultiMissile:
    """A group of three missiles fired at once"""
    def __init__(self, x, y, horizontal_speed=0):
        self.missiles = [
            Missile(x - 15, y, horizontal_speed),
            Missile(x, y - 5, horizontal_speed),
            Missile(x + 15, y, horizontal_speed)
        ]
        self.active = True
    
    def update(self, screen_width):
        for missile in self.missiles:
            missile.update(screen_width)
        
        # MultiMissile is active if any of its missiles are active
        self.active = any(missile.active for missile in self.missiles)
    
    def draw(self, screen):
        for missile in self.missiles:
            missile.draw(screen)