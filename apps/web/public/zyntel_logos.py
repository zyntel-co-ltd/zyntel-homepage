from PIL import Image, ImageDraw, ImageFont
import os

def create_smooth_3d_effect(draw, x, y, text, font, primary_color, size_factor=1.0):
    """Create smooth gradient 3D effect with harmonious transition"""
    # Create smooth gradient from dark to light
    shadow_steps = 8
    max_shadow_offset = int(6 * size_factor)
    
    # Generate smooth gradient colors
    for i in range(shadow_steps, 0, -1):
        # Calculate shadow position and opacity for smooth transition
        offset = int(max_shadow_offset * (i / shadow_steps))
        alpha = int(80 * (i / shadow_steps))
        
        # Calculate color intensity for smooth gradient
        intensity = 0.5 + (0.5 * (i / shadow_steps))
        shadow_color = (
            int(primary_color[0] * intensity),
            int(primary_color[1] * intensity), 
            int(primary_color[2] * intensity)
        )
        
        # Ensure color is proper format
        shadow_color_final = shadow_color + (alpha,) if len(primary_color) == 4 else shadow_color
        draw.text((x + offset, y + offset), text, fill=shadow_color_final, font=font, anchor="mm")
    
    # Main text with full color - FIXED COLOR FORMAT
    main_color = primary_color if len(primary_color) == 4 else primary_color + (255,)
    draw.text((x, y), text, fill=main_color, font=font, anchor="mm")

def hex_to_rgba(hex_color):
    """Convert hex color to RGBA tuple"""
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, 255)

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b)

def create_code_logo():
    """Create high-resolution JavaScript function style logo"""
    os.makedirs('logos', exist_ok=True)
    
    # Find Consolas font
    font_paths = [
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/consolab.ttf",
        "/Library/Fonts/Consolas.ttf",
        "/usr/share/fonts/truetype/consolas.ttf",
    ]
    
    font = None
    for path in font_paths:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, 100)  # Start with base size for high res
                print(f"Using font: {path}")
                break
            except:
                continue
    
    if font is None:
        print("Consolas font not found.")
        return
    
    # Define colors for different parts
    colors = {
        'zyntel': '#00f0ff',      # Vivid cyan
        'brackets': '#c0c0c0',    # Light gray
        'measured': '#ffe066',    # Pastel yellow
        'managed': '#7de19a'      # Green
    }
    
    # Create different background versions
    backgrounds = {
        'transparent': (0, 0, 0, 0),
        'white': (255, 255, 255, 255),
        'dark': (10, 10, 10, 255)  # #0a0a0a
    }
    
    # High resolution sizes - create one large version that can be scaled down
    resolutions = {
        'large': (2000, 600),    # Billboards/large displays
        'medium': (1000, 300),   # Standard web use
        'small': (500, 150)      # Mobile/favicons
    }
    
    for bg_name, bg_color in backgrounds.items():
        for size_name, (width, height) in resolutions.items():
            # Calculate font size based on resolution
            base_font_size = 100  # For large size
            if size_name == 'medium':
                font_size = 50
            else:  # small
                font_size = 25
                
            img = Image.new('RGBA', (width, height), bg_color)
            draw = ImageDraw.Draw(img)
            
            try:
                current_font = ImageFont.truetype(font.path, font_size)
            except:
                current_font = font
            
            # Your exact code formatting
            line_parts = [
                ["zyntel", "()", " => ", "{"],
                ['    "', "measured", ".", "managed", '";'],
                ["}"]
            ]
            
            line_colors = [
                [colors['zyntel'], colors['brackets'], colors['brackets'], colors['brackets']],
                [colors['brackets'], colors['measured'], colors['brackets'], colors['managed'], colors['brackets']],
                [colors['brackets']]
            ]
            
            # Calculate dimensions for perfect centering
            line_height = font_size * 1.02
            
            # Calculate max line width
            max_line_width = 0
            for parts in line_parts:
                line_width = sum(draw.textlength(part, font=current_font) for part in parts)
                max_line_width = max(max_line_width, line_width)
            
            # Center the content
            start_x = (width - max_line_width) / 2
            start_y = (height - (line_height * len(line_parts))) / 2
            
            current_y = start_y
            
            # Draw each line with exact formatting
            for i, (parts, colors_list) in enumerate(zip(line_parts, line_colors)):
                current_x = start_x
                
                # Add extra indentation for line 2
                if i == 1:
                    current_x += font_size * 0.8  # Proportional indentation
                
                for part, color in zip(parts, colors_list):
                    draw.text((current_x, current_y), part, fill=hex_to_rgba(color), font=current_font)
                    current_x += draw.textlength(part, font=current_font)
                
                current_y += line_height
            
            # Save with size and background name
            filename = f'logos/zyntel_code_{size_name}_{bg_name}_bg.png'
            img.save(filename, 'PNG')
            print(f"Created code logo: {filename}")

def create_complete_logo_set():
    """Create complete logo set with ALL color variations and backgrounds"""
    os.makedirs('logos', exist_ok=True)
    
    # ALL Color variations - including the original ones
    color_schemes = {
        'black': '#0a0a0a',
        'cyan': '#00f0ff',
        'silver': '#c0c0c0', 
        'gold': '#ffe066',
        'mint': '#7de19a',
        # Original colors from previous script
        'white': '#ffffff',
        'blue': '#007acc',
        'purple': '#9d4edd',
        'orange': '#ff6b35'
    }
    
    # Background variations for light/dark mode
    backgrounds = {
        'transparent': (0, 0, 0, 0),
        'white': (255, 255, 255, 255),
        'dark': (10, 10, 10, 255),
        'light_gray': (240, 240, 240, 255)
    }
    
    # Find Consolas font
    font_paths = [
        "C:/Windows/Fonts/consola.ttf",
        "C:/Windows/Fonts/consolab.ttf",
        "/Library/Fonts/Consolas.ttf",
    ]
    
    font = None
    for path in font_paths:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, 100)
                print(f"Using font for logos: {path}")
                break
            except:
                continue
    
    if font is None:
        print("Consolas font not found.")
        return
    
    # Create ALL variations for each color - FIXED COLOR HANDLING
    for color_name, color_hex in color_schemes.items():
        color_rgba = hex_to_rgba(color_hex)
        
        print(f"Creating {color_name} variations...")
        
        # Create with different backgrounds
        for bg_name, bg_color in backgrounds.items():
            # 1. LOGO WITH NAME (800x400) - FIXED CENTERING
            create_logo_with_name(color_name, color_rgba, font, bg_name, bg_color)
            
            # 2. LOGO ALONE (400x400)
            create_logo_alone(color_name, color_rgba, font, bg_name, bg_color)
        
        print(f"✅ Completed {color_name} variations")
    
    # 3. Create ICO files for main colors
    main_colors_for_ico = ['cyan', 'black', 'silver', 'gold', 'mint']
    for color_name in main_colors_for_ico:
        if color_name in color_schemes:
            create_proper_ico_file(font, color_schemes[color_name], color_name)
    
    print("\n🎨 All color variations created successfully!")

def create_logo_with_name(color_name, color_rgba, font, bg_name, bg_color):
    """Create logo with company name - PROPER CENTERING WITH GOOD SPACING"""
    img = Image.new('RGBA', (800, 400), bg_color)
    draw = ImageDraw.Draw(img)
    
    try:
        bracket_font = ImageFont.truetype(font.path, 220)
        text_font = ImageFont.truetype(font.path, 140)
    except:
        bracket_font = font
        text_font = font
    
    center_y = 200
    
    # Calculate exact positions for perfect centering
    bracket_width = draw.textlength("}", font=bracket_font)
    text_width = draw.textlength("zyntel", font=text_font)
    
    # Total width including the gap we want (about 60-80px between elements)
    total_width = bracket_width + text_width + 60  # 60px gap
    
    # Start from the center and work outwards
    start_x = (800 - total_width) / 2
    
    # Position bracket and text
    bracket_x = start_x + bracket_width / 2
    text_x = start_x + bracket_width + 60 + text_width / 2
    
    # FIXED: Ensure color is proper RGBA tuple
    if len(color_rgba) == 3:
        color_rgba = color_rgba + (255,)
    
    create_smooth_3d_effect(draw, bracket_x, center_y, "}", bracket_font, color_rgba, 1.2)
    create_smooth_3d_effect(draw, text_x, center_y, "zyntel", text_font, color_rgba, 1.2)
    
    bg_suffix = f"_{bg_name}_bg" if bg_name != 'transparent' else ""
    img.save(f'logos/zyntel_full_{color_name}{bg_suffix}.png', 'PNG')

def create_logo_alone(color_name, color_rgba, font, bg_name, bg_color):
    """Create logo alone (just the bracket)"""
    img = Image.new('RGBA', (400, 400), bg_color)
    draw = ImageDraw.Draw(img)
    
    try:
        bracket_font = ImageFont.truetype(font.path, 320)
    except:
        bracket_font = font
    
    center = (200, 200)
    
    # FIXED: Ensure color is proper RGBA tuple
    if len(color_rgba) == 3:
        color_rgba = color_rgba + (255,)
    
    create_smooth_3d_effect(draw, center[0], center[1], "}", bracket_font, color_rgba, 1.5)
    
    bg_suffix = f"_{bg_name}_bg" if bg_name != 'transparent' else ""
    img.save(f'logos/zyntel_logo_{color_name}{bg_suffix}.png', 'PNG')

def create_proper_ico_file(font, primary_color_hex, color_name):
    """Create ICO file with proper transparency - FIXED VERSION"""
    primary_color_rgba = hex_to_rgba(primary_color_hex)
    
    # Standard icon sizes
    icon_sizes = [16, 24, 32, 48, 64, 128, 256]
    
    icon_images = []
    
    for size in icon_sizes:
        # Create RGBA image with transparency
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Calculate font size to fill the canvas
        font_size = max(8, int(size * 0.85))
        
        try:
            icon_font = ImageFont.truetype(font.path, font_size)
        except:
            icon_font = ImageFont.load_default()
        
        center = (size // 2, size // 2)
        
        # Simple shadow effect for larger icons
        if size >= 32:
            shadow_offset = max(1, size // 64)
            dark_color = (
                int(primary_color_rgba[0] * 0.7),
                int(primary_color_rgba[1] * 0.7),
                int(primary_color_rgba[2] * 0.7),
                255
            )
            
            draw.text((center[0] + shadow_offset, center[1] + shadow_offset), 
                     "}", fill=dark_color, font=icon_font, anchor="mm")
        
        # Main bracket - ensure proper RGBA color
        main_color = primary_color_rgba
        draw.text(center, "}", fill=main_color, font=icon_font, anchor="mm")
        
        icon_images.append(img)
    
    # Save as ICO - CRITICAL FIX: Save RGBA images directly to preserve transparency
    if icon_images:
        # Convert all images to 'RGBA' mode if they aren't already
        ico_images = []
        for img in icon_images:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            ico_images.append(img)
        
        # Save with transparency preserved
        ico_images[0].save(
            f'logos/zyntel_icon_{color_name}.ico', 
            format='ICO',
            sizes=[(s, s) for s in icon_sizes],
            append_images=ico_images[1:] if len(icon_sizes) > 1 else []
        )
    
    print(f"📱 Created ICO: zyntel_icon_{color_name}.ico")
    
    # Also create transparent PNG icons in all sizes for this color
    for size in [16, 32, 48, 64, 128, 256, 512]:
        create_single_icon_png(font, primary_color_hex, color_name, size)

def create_single_icon_png(font, primary_color_hex, color_name, size):
    """Create single PNG icon with proper sizing and transparency"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))  # Transparent background
    draw = ImageDraw.Draw(img)
    
    color_rgba = hex_to_rgba(primary_color_hex)
    
    try:
        font_size = int(size * 0.85)
        icon_font = ImageFont.truetype(font.path, font_size)
    except:
        return
    
    center = (size // 2, size // 2)
    
    # Create effect
    if size >= 32:
        shadow_offset = max(1, size // 48)
        dark_color = (
            int(color_rgba[0] * 0.7),
            int(color_rgba[1] * 0.7),
            int(color_rgba[2] * 0.7),
            255  # Full opacity for shadow
        )
        draw.text((center[0] + shadow_offset, center[1] + shadow_offset), 
                 "}", fill=dark_color, font=icon_font, anchor="mm")
    
    # Main bracket with original color and full opacity
    draw.text(center, "}", fill=color_rgba, font=icon_font, anchor="mm")
    
    img.save(f'logos/icon_{color_name}_{size}x{size}.png', 'PNG')

def create_readme_file():
    """Create a README file explaining all the logo variations"""
    # Use simple ASCII characters to avoid encoding issues
    readme_content = """# Zyntel Logo Assets

## Color Variations

### Main Colors:
- **cyan** (#00f0ff) - Primary brand color
- **black** (#0a0a0a) - Dark mode
- **silver** (#c0c0c0) - Light mode
- **gold** (#ffe066) - Accent
- **mint** (#7de19a) - Accent

### Additional Colors:
- **white** (#ffffff) - Light backgrounds
- **blue** (#007acc) - Professional
- **purple** (#9d4edd) - Creative
- **orange** (#ff6b35) - Energetic

## File Structure

### JavaScript Code Logo (zyntel_code_*_bg.png)
- Font size: 25px, Consolas Regular
- Line height: 1.02
- Letter spacing: 0
- Perfectly centered in canvas
- Exact code formatting with proper indentation

### Full Logo (zyntel_full_[color][_bg].png)
- Logo + "zyntel" text (800x400)
- Perfectly centered
- All colors x all backgrounds

### Logo Alone (zyntel_logo_[color][_bg].png)
- Just the bracket (400x400)
- All colors x all backgrounds

### ICO Files (zyntel_icon_[color].ico)
- All standard sizes (16x16 to 256x256)
- Main colors only

### PNG Icons (icon_[color]_[size]x[size].png)
- Individual sizes for precise control
- All main colors

## Usage Guide

### Light Mode:
- Use 'white' or 'light_gray' backgrounds
- Use 'black', 'cyan', or 'silver' logos

### Dark Mode:
- Use 'dark' backgrounds  
- Use 'white', 'cyan', or 'silver' logos

### Brand Primary:
- Use 'cyan' on 'transparent' or 'dark'
"""
    
    with open('logos/LOGO_README.md', 'w', encoding='utf-8') as f:
        f.write(readme_content)
    print("Created LOGO_README.md")

if __name__ == "__main__":
    print("Creating COMPLETE Zyntel logo set...")
    
    # 1. Create the JavaScript function style logo
    print("\nCreating JavaScript function logo...")
    create_code_logo()
    
    # 2. Create ALL logo variations
    print("\nCreating ALL color and background variations...")
    create_complete_logo_set()
    
    # 3. Create documentation
    print("\nCreating documentation...")
    create_readme_file()
    
    print("\nALL FILES CREATED SUCCESSFULLY!")
    print("\nCOMPLETE FILE LIST:")
    print("=" * 50)
    
    # Count files by type
    import glob
    files = glob.glob('logos/*.png') + glob.glob('logos/*.ico')
    
    print(f"PNG Files: {len([f for f in files if f.endswith('.png')])}")
    print(f"ICO Files: {len([f for f in files if f.endswith('.ico')])}")
    print(f"Total Files: {len(files)}")
    
    print("\nColor Variations: 8 colors")
    print("Background Types: 4 types (transparent, white, dark, light_gray)")
    print("Logo Types: 3 types (code, full, logo-alone)")
    print("ICO Files: 5 main colors with all standard sizes")
    print("\nAll files saved to 'logos/' folder")