import pygame
import sys
from game import Game

def main():
    # Initialize pygame
    pygame.init()
    
    # Create game instance
    game = Game()
    
    # Clock for controlling frame rate
    clock = pygame.time.Clock()
    
    # Main game loop
    while True:
        # Handle quit events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            # Handle one-time events (like restart or difficulty change)
            if event.type == pygame.KEYDOWN:
                if (game.game_over or game.game_won) and event.key == pygame.K_r:
                    game = Game()  # Reset the game
                elif event.key == pygame.K_1:  # Easy difficulty
                    game.set_difficulty("easy")
                elif event.key == pygame.K_2:  # Normal difficulty
                    game.set_difficulty("normal")
                elif event.key == pygame.K_3:  # Hard difficulty
                    game.set_difficulty("hard")
                elif event.key == pygame.K_h:  # Toggle help screen
                    game.help_screen.toggle()
        
        # Handle all input including firing in one place
        game.handle_movement()
        
        # Update game state
        game.update()
        
        # Render
        game.render()
        
        # Control frame rate
        clock.tick(60)

if __name__ == "__main__":
    main()