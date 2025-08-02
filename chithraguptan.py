import pygame
import random
import math

# --- 1. Initialization ---
pygame.init()

# Define screen dimensions
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600

# Colors and Constants
TERRARIUM_COLOR = (0, 50, 50)
LIZARD_COLOR = (50, 200, 50) # A base color for our lizard
MOUTH_COLOR = (0, 0, 0)
EYE_COLOR = (255, 255, 255)

# Colors for Chithraguptan's moods
COLOR_BORED = (100, 100, 100)
COLOR_CONTENT = (50, 200, 50) # A nice green
COLOR_PLAYFUL = (50, 255, 50)
COLOR_SAD = (70, 70, 150)
COLOR_ANGRY = (255, 50, 50)

# Create the screen surface
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Chithraguptan's Terrarium")

# --- Font for Emotion Display ---
font = pygame.font.SysFont("Arial", 24)

# --- 2. Chithraguptan's Body ---
body_segments = []
NUM_SEGMENTS = 15
BODY_SEGMENT_SIZE = 20
for i in range(NUM_SEGMENTS):
    body_segments.append(pygame.Rect(400, 300 - i * (BODY_SEGMENT_SIZE - 5), BODY_SEGMENT_SIZE, BODY_SEGMENT_SIZE))

# --- 3. Game State Variables ---
mood = "bored"
last_mouse_pos = pygame.mouse.get_pos()
last_change_time = pygame.time.get_ticks()
playful_timer = 0
click_count = 0
last_click_time = 0
angry_timer = 0
random_target_pos = (400, 300)
last_target_change = pygame.time.get_ticks()

# --- 4. Game Loop ---
running = True
clock = pygame.time.Clock()

while running:
    current_time = pygame.time.get_ticks()
    mouse_pos = pygame.mouse.get_pos()

    # --- Event Handling ---
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        
        if event.type == pygame.MOUSEBUTTONDOWN:
            if current_time - last_click_time < 500:
                click_count += 1
            else:
                click_count = 1
            last_click_time = current_time

    # --- 5. Logic: Mood and Evolution ---
    dx = mouse_pos[0] - last_mouse_pos[0]
    dy = mouse_pos[1] - last_mouse_pos[1]
    mouse_speed = (dx**2 + dy**2)**0.5
    last_mouse_pos = mouse_pos

    if click_count >= 3 and current_time - last_click_time < 1500:
        mood = "angry"
        angry_timer = current_time
        click_count = 0
    
    if mood == "angry":
        if mouse_speed < 5 and current_time - angry_timer > 3000:
             mood = "content"
        elif current_time - angry_timer > 10000:
            mood = "content"
    else:
        if mouse_speed > 30:
            mood = "playful"
            playful_timer = current_time
        elif mood == "playful" and current_time - playful_timer < 500:
            pass
        elif mouse_speed < 1:
            if current_time - last_change_time > 15000:
                mood = "angry"
                angry_timer = current_time
            elif current_time - last_change_time > 10000:
                mood = "sad"
            elif current_time - last_change_time > 3000:
                mood = "bored"
        else:
            mood = "content"
            last_change_time = current_time

    # --- 6. Logic: Movement ---
    head_target_pos = mouse_pos

    if mood == "angry":
        if current_time - last_target_change > 2000:
            random_target_pos = (random.randint(0, SCREEN_WIDTH), random.randint(0, SCREEN_HEIGHT))
            last_target_change = current_time
        head_target_pos = random_target_pos
        
    lerp_factor = 0.1
    if mood == "angry":
        lerp_factor = 0.15
        
    current_head_pos = body_segments[0].center
    move_x = (head_target_pos[0] - current_head_pos[0]) * lerp_factor
    move_y = (head_target_pos[1] - current_head_pos[1]) * lerp_factor
    body_segments[0].centerx += move_x
    body_segments[0].centery += move_y

    for i in range(1, NUM_SEGMENTS):
        previous_pos = body_segments[i - 1].center
        current_pos = body_segments[i].center
        
        lerp_factor = 0.1
        move_x = (previous_pos[0] - current_pos[0]) * lerp_factor
        move_y = (previous_pos[1] - current_pos[1]) * lerp_factor

        body_segments[i].centerx += move_x
        body_segments[i].centery += move_y

    # --- 7. Drawing ---
    screen.fill(TERRARIUM_COLOR)

    lizard_color = COLOR_CONTENT
    if mood == "bored":
        lizard_color = COLOR_BORED
    elif mood == "playful":
        lizard_color = COLOR_PLAYFUL
    elif mood == "sad":
        lizard_color = COLOR_SAD
    elif mood == "angry":
        lizard_color = COLOR_ANGRY
    
    # --- Draw the head and body ---
    for segment in body_segments:
        pygame.draw.circle(screen, lizard_color, segment.center, BODY_SEGMENT_SIZE)

    # --- Draw the eyes and mouth ---
    head_pos = body_segments[0].center
    # Eyes
    pygame.draw.circle(screen, EYE_COLOR, (head_pos[0] - 8, head_pos[1] - 5), 5)
    pygame.draw.circle(screen, EYE_COLOR, (head_pos[0] + 8, head_pos[1] - 5), 5)
    
    # Mouth and expression
    if mood == "bored":
        pygame.draw.line(screen, MOUTH_COLOR, (head_pos[0] - 5, head_pos[1] + 5), (head_pos[0] + 5, head_pos[1] + 5), 2)
    elif mood == "content":
        pygame.draw.arc(screen, MOUTH_COLOR, (head_pos[0] - 5, head_pos[1], 10, 10), 0, math.pi, 2)
    elif mood == "playful":
        pygame.draw.arc(screen, MOUTH_COLOR, (head_pos[0] - 5, head_pos[1] - 5, 10, 10), math.pi, math.pi * 2, 2)
    elif mood == "sad":
        pygame.draw.arc(screen, MOUTH_COLOR, (head_pos[0] - 5, head_pos[1] + 5, 10, 10), math.pi, math.pi * 2, 2)
    elif mood == "angry":
        pygame.draw.line(screen, MOUTH_COLOR, (head_pos[0] - 5, head_pos[1] - 5), (head_pos[0] + 5, head_pos[1] - 5), 2)


    # --- 8. Displaying the Mood ---
    mood_text = font.render(f"Mood: {mood.capitalize()}", True, (255, 255, 255))
    screen.blit(mood_text, (10, 10))

    # --- 9. Update the display and clock ---
    pygame.display.flip()
    clock.tick(60)

# --- 10. Quit Pygame ---
pygame.quit()